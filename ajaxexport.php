<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Create report in PDF
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2025 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../../../config.php');
require_login();
require_once($CFG->libdir . '/pdflib.php');

$cmid = required_param('cmid', PARAM_INT);
$quizid = required_param('quizid', PARAM_INT);
$course = required_param('course', PARAM_RAW);
$quizname = required_param('quizname', PARAM_RAW);
$quizopen = required_param('quizopen', PARAM_INT);

$debug = optional_param('debug', 0, PARAM_INT);
$context = context_module::instance($cmid);
require_capability('quizaccess/quizproctoring:quizproctoringoverallreport', $context);

$sql = "SELECT
    mp.attemptid AS pid, u.id, u.firstname, u.lastname, u.username,
    COUNT(CASE WHEN p.status = 'nofacedetected' THEN 1 END) AS
noface_count, COUNT(CASE WHEN p.status = 'minimizedetected' THEN 1 END)
AS minimize_count, COUNT(CASE WHEN p.status = 'multifacesdetected' THEN 1 END)
AS multifacesdetected, COUNT(CASE WHEN p.status = 'nocameradetected' THEN 1 END)
AS nocameradetected,
COUNT(CASE WHEN p.status = 'eyesnotopened' THEN 1 END)
AS eyesnotopened,
COUNT(CASE WHEN p.status IN
('minimizedetected', 'multifacesdetected', 'nofacedetected', 'nocameradetected', 'eyesnotopened')
    THEN 1 END) AS totalwarnings
FROM {user} u
JOIN {quizaccess_main_proctor} mp
    ON mp.userid = u.id AND mp.quizid = :quizid1AND mp.deleted = 0
LEFT JOIN {quizaccess_proctor_data} p
    ON p.userid = u.id AND p.quizid = :quizid2 AND p.deleted = 0
     AND mp.attemptid= p.attemptid
WHERE mp.userimg IS NOT NULL AND mp.userimg != '' AND p.image_status != 'M'
GROUP BY mp.attemptid, u.id, u.firstname, u.lastname
ORDER BY totalwarnings DESC";
$params = [
    'quizid1' => $quizid,
    'quizid2' => $quizid,
];
$records = $DB->get_records_sql($sql, $params);
if ($debug) {
    header('Content-Type: application/json');
    echo json_encode(array_values($records), JSON_PRETTY_PRINT);
    die;
}

$pdf = new \TCPDF();
$pdf->AddPage();

$pdf->SetFont('helvetica', 'B', 14);
$pdf->Cell(0, 10, 'Student Facial Analysis For All Students', 0, 0, 'C');
$pdf->SetTextColor(0, 0, 0);
$pdf->Ln(10);

$pdf->SetFont('helvetica', 'B', 11);
$pdf->Cell(60, 8, 'Course', 1, 0, 'C');
$pdf->Cell(80, 8, 'Assessment', 1, 0, 'C');
$pdf->Cell(40, 8, 'Date', 1, 1, 'C');

$quizopen = $quizopen ? userdate($quizopen, get_string('strftimerecent', 'langconfig')) : '-';
$pdf->SetFont('helvetica', '', 11);

$wcourse = 60;
$wquizname = 80;
$wquizopen = 40;

$startx = $pdf->GetX();
$starty = $pdf->GetY();

$hcourse = $pdf->getStringHeight($wcourse, $course);
$hquizname = $pdf->getStringHeight($wquizname, $quizname);
$hquizopen = $pdf->getStringHeight($wquizopen, $quizopen);

$maxheight = max($hcourse, $hquizname, $hquizopen);

$pdf->MultiCell($wcourse, $maxheight, $course, 1, 'C', false, 0, '', '', true, 0, false, true, $maxheight, 'M');
$pdf->MultiCell($wquizname, $maxheight, $quizname, 1, 'C', false, 0, '', '', true, 0, false, true, $maxheight, 'M');
$pdf->MultiCell($wquizopen, $maxheight, $quizopen, 1, 'C', false, 1, '', '', true, 0, false, true, $maxheight, 'M');

$pdf->Ln(10);

$pdf->SetFont('helvetica', 'B', 12);
$pdf->Cell(0, 10, 'PROCTORING ANALYSIS For QUIZ ID: ' . $quizid, 0, 1, 'C');
$pdf->Ln(5);

if (empty($records)) {
    $pdf->Write(0, 'No records found.');
} else {
    $pdf->SetFont('helvetica', 'B', 9);
    $pdf->Cell(28, 7, 'Student', 1, 0, 'C');
    $pdf->Cell(19, 7, 'Tab Switch', 1, 0, 'C');
    $pdf->Cell(19, 7, 'No Camera', 1, 0, 'C');
    $pdf->Cell(18, 7, 'No Face', 1, 0, 'C');
    $pdf->Cell(18, 7, 'No Eye', 1, 0, 'C');
    $pdf->Cell(18, 7, 'Multi Face', 1, 0, 'C');
    $pdf->Cell(20, 7, 'Total', 1, 0, 'C');
    $pdf->Cell(40, 7, 'Time', 1, 0, 'C');
    $pdf->Cell(15, 7, 'Photos', 1, 1, 'C');

    $pdf->SetFont('helvetica', '', 9);
    foreach ($records as $r) {
        $attempt = $DB->get_record('quiz_attempts', [
            'quiz' => $quizid,
            'userid' => $r->id,
            'id' => $r->pid,
        ]);

        $timestart = $attempt ? userdate($attempt->timestart, get_string('strftimedatetime', 'langconfig')) : '-';
        $imagessurl = new moodle_url('/mod/quiz/accessrule/quizproctoring/reviewattempts.php', [
            'userid' => $r->id,
            'cmid' => $cmid,
            'quizid' => $quizid,
        ]);
        $linktext = 'view';
        $linkurl = $imagessurl->out();
        $fullname = $r->firstname . ' ' . $r->lastname . ' (' . $r->username . ')';

        $wstudent = 28;
        $wtabswitch = 19;
        $wcamera = 19;
        $wnoface = 18;
        $wnoeye = 18;
        $wmultiface = 18;
        $wfacemismatch = 20;
        $wtime = 40;
        $wphotos = 15;

        $hstudent = $pdf->getStringHeight($wstudent, $fullname);
        $htabswitch = $pdf->getStringHeight($wtabswitch, $r->minimize_count);
        $hcamera = $pdf->getStringHeight($wcamera, $r->nocameradetected);
        $hnoface = $pdf->getStringHeight($wnoface, $r->noface_count);
        $hnoeye = $pdf->getStringHeight($wnoeye, $r->eyesnotopened);
        $hmultiface = $pdf->getStringHeight($wmultiface, $r->multifacesdetected);
        $hfacemismatch = $pdf->getStringHeight($wfacemismatch, $r->totalwarnings);
        $htime = $pdf->getStringHeight($wtime, $timestart);
        $hphotos = $pdf->getStringHeight($wphotos, 'view');

        $maxheight = max($hstudent, $htabswitch, $hcamera, $hnoface, $hnoeye, $hmultiface, $hfacemismatch, $htime, $hphotos);

        $x = $pdf->GetX();
        $y = $pdf->GetY();

        $pdf->SetXY($x, $y);
        $pdf->MultiCell($wstudent, $maxheight, $fullname, 1, 'C', false, 0);

        $pdf->SetXY($x + $wstudent, $y);
        $pdf->MultiCell($wtabswitch, $maxheight, $r->minimize_count, 1, 'C', false, 0);

        $pdf->SetXY($x + $wstudent + $wtabswitch, $y);
        $pdf->MultiCell($wcamera, $maxheight, $r->nocameradetected, 1, 'C', false, 0);

        $pdf->SetXY($x + $wstudent + $wtabswitch + $wcamera, $y);
        $pdf->MultiCell($wnoface, $maxheight, $r->noface_count, 1, 'C', false, 0);

        $pdf->SetXY($x + $wstudent + $wtabswitch + $wcamera + $wnoface, $y);
        $pdf->MultiCell($wnoeye, $maxheight, $r->eyesnotopened, 1, 'C', false, 0);

        $pdf->SetXY($x + $wstudent + $wtabswitch + $wcamera + $wnoface + $wnoeye, $y);
        $pdf->MultiCell($wmultiface, $maxheight, $r->multifacesdetected, 1, 'C', false, 0);

        $pdf->SetXY($x + $wstudent + $wtabswitch + $wcamera + $wnoface + $wnoeye + $wmultiface, $y);
        $pdf->MultiCell($wfacemismatch, $maxheight, $r->totalwarnings, 1, 'C', false, 0);

        $pdf->SetXY($x + $wstudent + $wtabswitch + $wcamera + $wnoface + $wnoeye + $wmultiface + $wfacemismatch, $y);
        $pdf->MultiCell($wtime, $maxheight, $timestart, 1, 'C', false, 0);

        $pdf->SetXY($pdf->GetX(), $pdf->GetY());

        $pdf->SetFont('helvetica', 'U', 10);
        $pdf->SetTextColor(0, 0, 255);

        $pdf->Cell($wphotos, $maxheight, $linktext, 1, 1, 'C', false, $linkurl);

        $pdf->SetFont('helvetica', '', 10);
        $pdf->SetTextColor(0, 0, 0);
    }
}

$filename = 'proctoring_report_' . $course . '.pdf';
$tempdir = make_temp_directory('quizaccess_quizproctoring/reports');
$filepath = $tempdir . '/' . $filename;
$pdf->Output($filepath, 'F');

$fileurl = new moodle_url('/mod/quiz/accessrule/quizproctoring/tempdownload.php', ['filename' => $filename]);
echo json_encode(['url' => $fileurl->out(false)]);
