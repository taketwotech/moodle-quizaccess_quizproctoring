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

require_once($CFG->dirroot . '/mod/quiz/locallib.php');
require_login();
$userid = required_param('userid', PARAM_INT);
$attemptid = required_param('attemptid', PARAM_INT);
$quizid = required_param('quizid', PARAM_INT);
$url = required_param('externalurl', PARAM_RAW);

require_once($CFG->dirroot . '/mod/quiz/locallib.php');

if ($recordurl = $DB->get_record('quizaccess_proctor_data', array('userid' => $userid, 'quizid' => $quizid, 'image_status' => 'M', 'attemptid' => $attemptid))) {
    $filename = $userid.'_'.$quizid.'_'.$attemptid.'_combined';
    $sql = "SELECT * FROM {quizaccess_proctor_video} WHERE proctor_id = $recordurl->id ORDER BY id ASC";
    $getvideos = $DB->get_records_sql($sql);
    $videosList = array();
    if($getvideos) {
        foreach ($getvideos as $video) {
            $videosList[] = $video->quiz_videos;
        }

       $postdata = array(
            "url"=> $url,
            "data"=> $videosList,
            "fullvideoname"=> $filename,
        );
        $response = \quizaccess_quizproctoring\api::merge_video_api(json_encode($postdata));
        if($response){
            echo json_encode(array('success' => true, 'videoname' => $filename.'.webm'));
            die();
        }
    }else {
        echo json_encode(array('success' => false, 'message' => get_string('novideo', 'quizaccess_quizproctoring')));
    }
}