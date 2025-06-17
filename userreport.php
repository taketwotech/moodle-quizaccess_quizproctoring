<?php
require_once(__DIR__ . '/../../../../config.php');
require_login();
require_once($CFG->libdir . '/pdflib.php');

$attemptid = required_param('attemptid', PARAM_INT);
$quizid = required_param('quizid', PARAM_INT);
$userid = required_param('userid', PARAM_INT);
$username = required_param('username', PARAM_RAW);

// Fetch quiz and attempt details
$quiz = $DB->get_record('quiz', ['id' => $quizid], '*', MUST_EXIST);
$user = $DB->get_record('user', ['id' => $userid], '*', MUST_EXIST);
$attempt = $DB->get_record('quiz_attempts', [
    'quiz' => $quizid,
    'userid' => $userid,
    'id' => $attemptid,
]);

// Preprocess image
function preprocessImage($sourcePath, $tempDir) {
    $info = getimagesize($sourcePath);
    if (!$info) {
        error_log("Failed to get image size: $sourcePath");
        return false;
    }

    $mime = $info['mime'];
    $ext = pathinfo($sourcePath, PATHINFO_EXTENSION);
    $filename = basename($sourcePath, '.' . $ext);

    switch ($mime) {
        case 'image/jpeg':
            $image = @imagecreatefromjpeg($sourcePath);
            $ext = '.jpg';
            break;
        case 'image/png':
            $image = @imagecreatefrompng($sourcePath);
            $ext = '.png';
            break;
        default:
            error_log("Unsupported image MIME type: $mime");
            return false;
    }

    if (!$image) {
        error_log("Failed to create image resource: $sourcePath");
        return false;
    }

    $tempPath = $tempDir . 'processed_' . $filename . $ext;
    $newImage = imagecreatetruecolor(imagesx($image), imagesy($image));
    if (!$newImage) {
        imagedestroy($image);
        error_log("Failed to create true color image: $sourcePath");
        return false;
    }

    imagecopy($newImage, $image, 0, 0, 0, 0, imagesx($image), imagesy($image));

    $result = ($mime === 'image/png') ?
        imagepng($newImage, $tempPath, 9) :
        imagejpeg($newImage, $tempPath, 90);

    imagedestroy($image);
    imagedestroy($newImage);

    if (!$result) {
        error_log("Failed to save processed image: $tempPath");
        return false;
    }

    return $tempPath;
}

// Fetch image records
$sqlm = "SELECT * FROM {quizaccess_main_proctor}
        WHERE userid = :userid AND quizid = :quizid AND attemptid = :attemptid AND deleted = 0
        ORDER BY id ASC";
$params = ['userid' => $userid, 'quizid' => $quizid, 'attemptid' => $attemptid];
$getmimages = $DB->get_records_sql($sqlm, $params);

$sql = "SELECT * FROM {quizaccess_proctor_data}
        WHERE userid = :userid AND quizid = :quizid AND attemptid = :attemptid AND deleted = 0
        ORDER BY id ASC";
$params = ['userid' => $userid, 'quizid' => $quizid, 'attemptid' => $attemptid];
$getimages = $DB->get_records_sql($sql, $params);
$combinedimages = array_merge($getmimages, $getimages);

$timestart = userdate($attempt->timestart, get_string('strftimerecent', 'langconfig'));

// Start PDF
$pdf = new \TCPDF();
$pdf->AddPage();
$pdf->SetFont('helvetica', 'B', 14);
$pdf->Cell(0, 10, 'Student Facial Analysis For ' . $username, 0, 1, 'C');

$pdf->SetFont('helvetica', 'B', 14);
$pdf->Cell(0, 10, $quiz->name, 0, 1, 'C'); // using 1 to move to next line
$pdf->SetTextColor(0, 0, 0);
$pdf->Ln(5); // Optional smaller spacing

// Table header
$pdf->SetFont('helvetica', 'B', 11);
$pdf->Cell(60, 8, 'Student name', 1, 0, 'C');
$pdf->Cell(60, 8, 'Attempt ID', 1, 0, 'C');
$pdf->Cell(60, 8, 'Attempt Time', 1, 1, 'C');

// Column widths
$w_name = 60;
$w_attemptid = 60;
$w_timestart = 60;

// Prepare the actual values
$studentName = $user->firstname . ' ' . $user->lastname;
$attemptIdStr = (string)$attemptid;
$timeStr = $timestart;

// Get heights for each value
$pdf->SetFont('helvetica', '', 11);
$h_name = $pdf->getStringHeight($w_name, $studentName);
$h_id = $pdf->getStringHeight($w_attemptid, $attemptIdStr);
$h_time = $pdf->getStringHeight($w_timestart, $timeStr);

// Determine max height for row
$maxHeight = max($h_name, $h_id, $h_time);

// Write the row using MultiCell
$pdf->MultiCell($w_name, $maxHeight, $studentName, 1, 'C', false, 0, '', '', true, 0, false, true, $maxHeight, 'M');
$pdf->MultiCell($w_attemptid, $maxHeight, $attemptIdStr, 1, 'C', false, 0, '', '', true, 0, false, true, $maxHeight, 'M');
$pdf->MultiCell($w_timestart, $maxHeight, $timeStr, 1, 'C', false, 1, '', '', true, 0, false, true, $maxHeight, 'M');

// Add spacing after the row
$pdf->Ln(8);

// Image layout config
$imagesPerRow = 3;
$imageWidth = 55;
$imageHeight = 40;
$textHeight = 7;
$cellPadding = 5;
$col = 0;
$startX = $pdf->GetX();
$startY = $pdf->GetY();

foreach ($combinedimages as $img) {
    //if ($img->image_status === 'M') continue;

    // Resolve image path
    if (empty($img->userimg)) {
        $imagepath = ($img->status === 'minimizedetected') ?
            $CFG->dirroot . '/mod/quiz/accessrule/quizproctoring/pix/tabswitch.png' :
            $CFG->dirroot . '/mod/quiz/accessrule/quizproctoring/pix/nocamera.png';
    } else {
        $imagepath = $CFG->dataroot . '/proctorlink/' . $img->userimg;
        if (strpos($imagepath, $CFG->dataroot) === 0) {
            $processedPath = preprocessImage($imagepath, $CFG->dataroot . '/proctorlink/');
            if (!$processedPath || !file_exists($processedPath)) {
                error_log("Skipping image due to failed preprocessing: $imagepath");
                continue;
            }
            $imagepath = $processedPath;
        }
    }

    $imagepath = str_replace('\\', '/', $imagepath);
    if (!file_exists($imagepath) || !getimagesize($imagepath)) {
        error_log("Skipping invalid image: $imagepath");
        continue;
    }

    // Image metadata
    $status = $img->status ? get_string($img->status, 'quizaccess_quizproctoring', '') : '';
    $formattedtime = userdate($img->timecreated, '%H:%M');

    // Draw image
    $x = $pdf->GetX();
    $y = $pdf->GetY();
    $pdf->Image($imagepath, $x, $y, $imageWidth, $imageHeight);

    // Status and timestamp (small)
    $pdf->SetFont('helvetica', '', 7);
    $pdf->SetXY($x, $y + $imageHeight + 1);
    $pdf->Cell($imageWidth, 3.5, $status, 0, 2, 'C');
    $pdf->Cell($imageWidth, 3.5, $formattedtime, 0, 0, 'C');

    $col++;
    if ($col % $imagesPerRow === 0) {
        $pdf->SetXY($startX, $y + $imageHeight + $textHeight + 2); // go to next row
    } else {
        $pdf->SetXY($x + $imageWidth + $cellPadding, $y);
    }

    // Page break if too low
    if ($pdf->GetY() > 240) {
        $pdf->AddPage();
        $startX = $pdf->GetX();
        $startY = $pdf->GetY();
        $col = 0;
    }
}

$filename = 'facial_analysis_report_' . preg_replace('/[^a-zA-Z0-9_]/', '_', $user->firstname.' '.$user->lastname) . '.pdf';
$pdf->Output($filename, 'D');