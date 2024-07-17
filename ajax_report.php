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
$currentpage = optional_param('currentpage', 0 , PARAM_INT);

if ($currentpage) {
    $offset = $currentpage * 20;
    $sql = "select * from {quizaccess_proctor_data} where  (status != '' OR image_status = 'M')
    AND userid = ".$userid." AND quizid =". $quizid. " AND attemptid =". $attemptid." AND deleted = 0  AND userimg IS NOT NULL ";
    $getimages = $DB->get_records_sql($sql, null, $offset , 20);

    $imgarray = [];
    $sqlcount = "select * from {quizaccess_proctor_data} where (status != '' OR image_status = 'M')
    AND userid = ".$userid." AND quizid =". $quizid. " AND attemptid =". $attemptid." AND deleted = 0  AND userimg IS NOT NULL ";
    $countrecord  = $DB->get_records_sql($sqlcount, null);

    if ($countrecord) {
        $countrecord = ceil(count($countrecord) / 20);
    }
    foreach ($getimages as $img) {
        if (strlen($img->userimg) < 40) {
            $quizobj = \quiz::create($img->quizid, $img->userid);
            $context = $quizobj->get_context();
            $fs = get_file_storage();
            $f1 = $fs->get_file($context->id, 'quizaccess_quizproctoring', 'cameraimages', $img->id, '/', $img->userimg);
            $target = $f1->get_content();
        } else {
            $target = $img->userimg;
        }
        array_push($imgarray, ['title' => $img->image_status == 'M' ?
            get_string('mainimage', 'quizaccess_quizproctoring') :
            get_string($img->status, 'quizaccess_quizproctoring', ''),
            'img' => $target,
            'totalpage' => $countrecord,
        ]);
    }
    echo json_encode($imgarray);

} else {
    $sql = "select * from {quizaccess_proctor_data} where  (status != '' OR image_status = 'M')
    AND userid = ".$userid." AND quizid =". $quizid. " AND attemptid =". $attemptid." AND deleted = 0 AND userimg IS NOT NULL ";
    $getimages = $DB->get_records_sql($sql, null, '' , 20);
    $imgarray = [];
    $sqlcount = "select * from {quizaccess_proctor_data} where (status != '' OR image_status = 'M')
    AND userid = ".$userid." AND quizid =". $quizid. " AND attemptid =". $attemptid." AND deleted = 0  AND userimg IS NOT NULL ";
    $countrecord  = $DB->get_records_sql($sqlcount, null);
    $totalrecord = count($countrecord);
    if ($countrecord) {
        $countrecord = ceil(count($countrecord) / 20);
    }
    foreach ($getimages as $img) {
        if (strlen($img->userimg) < 40) {
            $quizobj = \quiz::create($img->quizid, $img->userid);
            $context = $quizobj->get_context();
            $fs = get_file_storage();
            $f1 = $fs->get_file($context->id, 'quizaccess_quizproctoring', 'cameraimages', $img->id, '/', $img->userimg);
            $target = $f1->get_content();
        } else {
            $target = $img->userimg;
        }
        array_push($imgarray, ['title' => $img->image_status == 'M' ?
            get_string('mainimage', 'quizaccess_quizproctoring') :
            get_string($img->status, 'quizaccess_quizproctoring', ''),
            'img' => $target,
            'totalpage' => $countrecord, 'total' => $totalrecord,
        ]);
    }
    echo json_encode($imgarray);
}
