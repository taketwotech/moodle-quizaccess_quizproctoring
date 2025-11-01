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

// Force user's language for translations.
if (!empty($USER->lang)) {
    $curlang = current_language();
    if ($curlang !== $USER->lang) {
        // Temporarily switch to user's language.
        $SESSION->forcelang = $USER->lang;
    }
}

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

$pdf = new \TCPDF('P', 'mm', 'A4', true, 'UTF-8', false);
$pdf->SetCreator(PDF_CREATOR);
$pdf->SetAuthor('Moodle');
$pdf->SetTitle(get_string('pdf_title', 'quizaccess_quizproctoring'));
$pdf->SetMargins(10, 10, 10);
$pdf->SetAutoPageBreak(true, 10);
$pdf->AddPage();

$pdf->SetFont('freeserif', 'B', 14);
$pdf->Cell(0, 10, get_string('pdf_title', 'quizaccess_quizproctoring'), 0, 0, 'C');
$pdf->SetTextColor(0, 0, 0);
$pdf->Ln(10);

$pdf->SetFont('freeserif', 'B', 11);
$pdf->Cell(60, 8, get_string('pdf_course', 'quizaccess_quizproctoring'), 1, 0, 'C');
$pdf->Cell(80, 8, get_string('pdf_assessment', 'quizaccess_quizproctoring'), 1, 0, 'C');
$pdf->Cell(40, 8, get_string('pdf_date', 'quizaccess_quizproctoring'), 1, 1, 'C');

$quizopen = $quizopen ? userdate($quizopen, get_string('strftimerecent', 'langconfig')) : '-';
$pdf->SetFont('freeserif', '', 11);

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

$pdf->SetFont('freeserif', 'B', 12);
$pdf->Cell(0, 10, get_string('pdf_analysis_title', 'quizaccess_quizproctoring', $quizid), 0, 1, 'C');
$pdf->Ln(5);

if (empty($records)) {
    $pdf->Write(0, get_string('norecordsfound', 'quizaccess_quizproctoring'));
} else {
    $pdf->SetFont('freeserif', 'B', 6.5);
    $pdf->Cell(30, 7, get_string('pdf_student', 'quizaccess_quizproctoring'), 1, 0, 'C');
    $pdf->Cell(24, 7, get_string('pdf_tabswitch', 'quizaccess_quizproctoring'), 1, 0, 'C');
    $pdf->Cell(20, 7, get_string('pdf_nocamera', 'quizaccess_quizproctoring'), 1, 0, 'C');
    $pdf->Cell(18, 7, get_string('pdf_noface', 'quizaccess_quizproctoring'), 1, 0, 'C');
    $pdf->Cell(16, 7, get_string('pdf_noeye', 'quizaccess_quizproctoring'), 1, 0, 'C');
    $pdf->Cell(20, 7, get_string('pdf_multiface', 'quizaccess_quizproctoring'), 1, 0, 'C');
    $pdf->Cell(17, 7, get_string('pdf_total', 'quizaccess_quizproctoring'), 1, 0, 'C');
    $pdf->Cell(28, 7, get_string('pdf_time', 'quizaccess_quizproctoring'), 1, 0, 'C');
    $pdf->Cell(17, 7, get_string('pdf_photos', 'quizaccess_quizproctoring'), 1, 1, 'C');

    $pdf->SetFont('freeserif', '', 6.5);
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
        $linktext = get_string('pdf_view', 'quizaccess_quizproctoring');
        $linkurl = $imagessurl->out();
        $fullname = $r->firstname . ' ' . $r->lastname . ' (' . $r->username . ')';

        $wstudent = 30;
        $wtabswitch = 24;
        $wcamera = 20;
        $wnoface = 18;
        $wnoeye = 16;
        $wmultiface = 20;
        $wfacemismatch = 17;
        $wtime = 28;
        $wphotos = 17;

        $hstudent = $pdf->getStringHeight($wstudent, $fullname);
        $htabswitch = $pdf->getStringHeight($wtabswitch, $r->minimize_count);
        $hcamera = $pdf->getStringHeight($wcamera, $r->nocameradetected);
        $hnoface = $pdf->getStringHeight($wnoface, $r->noface_count);
        $hnoeye = $pdf->getStringHeight($wnoeye, $r->eyesnotopened);
        $hmultiface = $pdf->getStringHeight($wmultiface, $r->multifacesdetected);
        $hfacemismatch = $pdf->getStringHeight($wfacemismatch, $r->totalwarnings);
        $htime = $pdf->getStringHeight($wtime, $timestart);
        $hphotos = $pdf->getStringHeight($wphotos, $linktext);

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

        $pdf->SetFont('freeserif', 'U', 6.5);
        $pdf->SetTextColor(0, 0, 255);

        $pdf->Cell($wphotos, $maxheight, $linktext, 1, 1, 'C', false, $linkurl);

        $pdf->SetFont('freeserif', '', 6.5);
        $pdf->SetTextColor(0, 0, 0);
    }
}

$filename = 'proctoring_report_' . $course . '.pdf';
$tempdir = make_temp_directory('quizaccess_quizproctoring/reports');
$filepath = $tempdir . '/' . $filename;
$pdf->Output($filepath, 'F');

$fileurl = new moodle_url('/mod/quiz/accessrule/quizproctoring/tempdownload.php', ['filename' => $filename]);
echo json_encode(['url' => $fileurl->out(false)]);
