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
 * AJAX call to show proctor images on review attempt page
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2020 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
define('AJAX_SCRIPT', true);
require_once(__DIR__ . '/../../../../config.php');
require_once($CFG->libdir . '/completionlib.php');
require_once($CFG->dirroot . '/mod/quiz/locallib.php');
require_login();

$userid = required_param('userid', PARAM_INT);
$attemptid = required_param('attemptid', PARAM_INT);
$quizid = required_param('quizid', PARAM_INT);
$all = required_param('all', PARAM_BOOL);
$page = required_param('page', PARAM_INT);
$perpage = required_param('perpage', PARAM_INT);
$offset = ($page - 1) * $perpage;

$addsql = '';
if (!$all) {
    $addsql = " (status != '' OR image_status = 'M') AND ";
}
$sql = "SELECT * FROM {quizaccess_proctor_data}
        WHERE ".$addsql."userid = ".$userid."
        AND quizid = ".$quizid."
        AND attemptid = ".$attemptid."
        AND deleted = 0
        ORDER BY id ASC
        LIMIT ".$perpage." OFFSET ".$offset;

$getimages = $DB->get_records_sql($sql);
$sqlt = "SELECT * FROM {quizaccess_proctor_data}
        WHERE ".$addsql."userid = ".$userid."
        AND quizid = ".$quizid."
        AND attemptid = ".$attemptid."
        AND deleted = 0
        ORDER BY id ASC";
$totalimages = $DB->get_records_sql($sqlt);
$imgarray = [];
$totalrecord = count($totalimages);
$totalpages = ceil($totalrecord / $perpage);

foreach ($getimages as $img) {
    if ($img->userimg == '' && $img->image_status != 'M') {
        $imagepath = $CFG->dirroot. '/mod/quiz/accessrule/quizproctoring/pix/nocamera.png';
        if (file_exists($imagepath)) {
            $imagecontent = file_get_contents($imagepath);
            $imagebase64 = base64_encode($imagecontent);
            $target = 'data:image/png;base64,' . $imagebase64;
        }
    } else if (strlen($img->userimg) < 50) {
        $quizobj = \quiz::create($img->quizid, $img->userid);
        $context = $quizobj->get_context();
        $fs = get_file_storage();
        $f1 = $fs->get_file($context->id, 'quizaccess_quizproctoring', 'cameraimages', $img->id, '/', $img->userimg);
        $target = $f1->get_content();
    } else {
        $target = $img->userimg;
    }
    $status = '';
    if ($img->status) {
        $status = get_string($img->status, 'quizaccess_quizproctoring', '');
    }
    $formattedtime = userdate($img->timecreated, '%H:%M');
    if ($img->image_status == 'M') {
        $imagestatusstr = get_string('mainimage', 'quizaccess_quizproctoring');
    } else if ($img->status != '') {
        $imagestatusstr = get_string('imgwarning', 'quizaccess_quizproctoring');
    } else {
        $imagestatusstr = get_string('green', 'quizaccess_quizproctoring');
    }
    array_push($imgarray, ['title' => $img->image_status == 'M' ?
        get_string('mainimage', 'quizaccess_quizproctoring') :
        $status,
        'img' => $target,
        'imagestatus' => $imagestatusstr,
        'timecreated' => $formattedtime,
        'totalpage' => $totalpages,
        'total' => $totalrecord,
    ]);
}
$response = [
    'images' => $imgarray,
    'totalRecords' => $totalrecord,
    'totalPages' => $totalpages,
    'currentPage' => $page,
];
echo json_encode($response);
