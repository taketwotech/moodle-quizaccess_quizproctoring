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
 * Create user report.
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2025 Mahendra Soni
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../../../config.php');
require_login();
require_once($CFG->libdir . '/pdflib.php');

$attemptid = required_param('attemptid', PARAM_INT);
$quizid = required_param('quizid', PARAM_INT);
$userid = required_param('userid', PARAM_INT);
$username = required_param('username', PARAM_RAW);

$quiz = $DB->get_record('quiz', ['id' => $quizid], '*', MUST_EXIST);
$user = $DB->get_record('user', ['id' => $userid], '*', MUST_EXIST);
$attempt = $DB->get_record('quiz_attempts', [
    'quiz' => $quizid,
    'userid' => $userid,
    'id' => $attemptid,
]);

function preprocessimage($sourcepath, $tempdir) {
    $info = getimagesize($sourcepath);
    if (!$info) {
        return false;
    }

    $mime = $info['mime'];
    $ext = pathinfo($sourcepath, PATHINFO_EXTENSION);
    $filename = basename($sourcepath, '.' . $ext);

    switch ($mime) {
        case 'image/jpeg':
            $image = @imagecreatefromjpeg($sourcepath);
            $ext = '.jpg';
            break;
        case 'image/png':
            $image = @imagecreatefrompng($sourcepath);
            $ext = '.png';
            break;
        default:
            return false;
    }

    if (!$image) {
        return false;
    }

    $temppath = $tempdir . 'processed_' . $filename . $ext;
    $newimage = imagecreatetruecolor(imagesx($image), imagesy($image));
    if (!$newimage) {
        imagedestroy($image);
        return false;
    }

    imagecopy($newimage, $image, 0, 0, 0, 0, imagesx($image), imagesy($image));

    $result = ($mime === 'image/png') ?
        imagepng($newimage, $temppath, 9) :
        imagejpeg($newimage, $temppath, 90);

    imagedestroy($image);
    imagedestroy($newimage);

    if (!$result) {
        return false;
    }

    return $temppath;
}

$sqlm = "SELECT * FROM {quizaccess_main_proctor}
        WHERE userid = :userid AND quizid = :quizid AND attemptid = :attemptid AND deleted = 0
        ORDER BY id ASC";
$params = ['userid' => $userid, 'quizid' => $quizid, 'attemptid' => $attemptid];
$getmimages = $DB->get_records_sql($sqlm, $params);

$sql = "SELECT * FROM {quizaccess_proctor_data}
        WHERE userid = :userid AND quizid = :quizid AND attemptid = :attemptid AND deleted = 0
         AND image_status != 'M' ORDER BY id ASC";
$params = ['userid' => $userid, 'quizid' => $quizid, 'attemptid' => $attemptid];
$getimages = $DB->get_records_sql($sql, $params);
$combinedimages = array_merge($getmimages, $getimages);

$timestart = userdate($attempt->timestart, get_string('strftimerecent', 'langconfig'));

$pdf = new \TCPDF();
$pdf->AddPage();
$pdf->SetFont('helvetica', 'B', 14);
$pdf->Cell(0, 10, 'Student Facial Analysis For ' . $username, 0, 1, 'C');

$pdf->SetFont('helvetica', 'B', 14);
$pdf->Cell(0, 10, $quiz->name, 0, 1, 'C');
$pdf->SetTextColor(0, 0, 0);
$pdf->Ln(5);

$pdf->SetFont('helvetica', 'B', 11);
$pdf->Cell(60, 8, 'Student name', 1, 0, 'C');
$pdf->Cell(60, 8, 'Attempt ID', 1, 0, 'C');
$pdf->Cell(60, 8, 'Attempt Time', 1, 1, 'C');

$wname = 60;
$wattemptid = 60;
$wtimestart = 60;

$studentname = $user->firstname . ' ' . $user->lastname;
$attemptidstr = (string)$attemptid;
$timestr = $timestart;

$pdf->SetFont('helvetica', '', 11);
$hname = $pdf->getStringHeight($wname, $studentname);
$hid = $pdf->getStringHeight($wattemptid, $attemptidstr);
$htime = $pdf->getStringHeight($wtimestart, $timestr);

$maxheight = max($hname, $hid, $htime);

$pdf->MultiCell($wname, $maxheight, $studentname, 1, 'C', false, 0, '', '', true, 0, false, true, $maxheight, 'M');
$pdf->MultiCell($wattemptid, $maxheight, $attemptidstr, 1, 'C', false, 0, '', '', true, 0, false, true, $maxheight, 'M');
$pdf->MultiCell($wtimestart, $maxheight, $timestr, 1, 'C', false, 1, '', '', true, 0, false, true, $maxheight, 'M');

$pdf->Ln(8);

$imagesperrow = 3;
$imagewidth = 55;
$imageheight = 40;
$textheight = 7;
$cellpadding = 5;
$col = 0;
$startx = $pdf->GetX();
$starty = $pdf->GetY();

foreach ($combinedimages as $img) {
    if (empty($img->userimg)) {
        $imagepath = ($img->status === 'minimizedetected') ?
            $CFG->dirroot . '/mod/quiz/accessrule/quizproctoring/pix/tabswitch.png' :
            $CFG->dirroot . '/mod/quiz/accessrule/quizproctoring/pix/nocamera.png';
    } else {
        $imagepath = $CFG->dataroot . '/proctorlink/' . $img->userimg;
        if (strpos($imagepath, $CFG->dataroot) === 0) {
            $processedpath = preprocessimage($imagepath, $CFG->dataroot . '/proctorlink/');
            if (!$processedpath || !file_exists($processedpath)) {
                continue;
            }
            $imagepath = $processedpath;
        }
    }

    $imagepath = str_replace('\\', '/', $imagepath);
    if (!file_exists($imagepath) || !getimagesize($imagepath)) {
        continue;
    }

    $status = $img->status ? get_string($img->status, 'quizaccess_quizproctoring', '') : '';
    $formattedtime = userdate($img->timecreated, '%H:%M');

    $x = $pdf->GetX();
    $y = $pdf->GetY();
    $pdf->Image($imagepath, $x, $y, $imagewidth, $imageheight);

    $pdf->SetFont('helvetica', '', 7);
    $pdf->SetXY($x, $y + $imageheight + 1);
    $pdf->Cell($imagewidth, 3.5, $status, 0, 2, 'C');
    $pdf->Cell($imagewidth, 3.5, $formattedtime, 0, 0, 'C');

    $col++;
    if ($col % $imagesperrow === 0) {
        $pdf->SetXY($startx, $y + $imageheight + $textheight + 2);
    } else {
        $pdf->SetXY($x + $imagewidth + $cellpadding, $y);
    }

    if ($pdf->GetY() > 240) {
        $pdf->AddPage();
        $startx = $pdf->GetX();
        $starty = $pdf->GetY();
        $col = 0;
    }

    if ($processedpath && file_exists($processedpath)) {
        @unlink($processedpath);
    }
}

$filename = 'facial_analysis_report_' . preg_replace('/[^a-zA-Z0-9_]/', '_', $user->firstname.' '.$user->lastname) . '.pdf';
$pdf->Output($filename, 'D');
