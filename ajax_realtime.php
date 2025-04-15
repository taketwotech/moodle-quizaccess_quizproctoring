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
 * AJAX call to save image file in real time and make it part of moodle file
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2024 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
define('AJAX_SCRIPT', true);

require_once(__DIR__ . '/../../../../config.php');
require_once($CFG->dirroot . '/mod/quiz/accessrule/quizproctoring/lib.php');
require_login();

$img = optional_param('imgBase64', '', PARAM_RAW);
$cmid = required_param('cmid', PARAM_INT);
$attemptid = required_param('attemptid', PARAM_INT);
$mainimage = optional_param('mainimage', false, PARAM_BOOL);
$validate = required_param('validate', PARAM_RAW);
$object = optional_param('objects', '', PARAM_RAW);

$mainentry = $DB->get_record('quizaccess_proctor_data', [
    'userid' => $USER->id,
    'quizid' => $cm->instance,
    'image_status' => 'M',
    'attemptid' => $attemptid]);
if (!$cm = get_coursemodule_from_id('quiz', $cmid)) {
    throw new moodle_exception('invalidcoursemodule');
}
$service = get_config('quizaccess_quizproctoring', 'serviceoption');
if (!$mainentry->isautosubmit) {
    switch ($validate) {
        case 'noface':
            if (!$mainimage) {
                quizproctoring_storeimage($img, $cmid, $attemptid, $cm->instance,
                    $mainimage, $service, QUIZACCESS_QUIZPROCTORING_NOFACEDETECTED);
            } else {
                throw new moodle_exception(QUIZACCESS_QUIZPROCTORING_NOFACEDETECTED, 'quizaccess_quizproctoring', '', '');
            }
            break;
        case 'multiface':
            if (!$mainimage) {
                quizproctoring_storeimage($img, $cmid, $attemptid, $cm->instance,
                $mainimage, $service, QUIZACCESS_QUIZPROCTORING_MULTIFACESDETECTED);
            } else {
                throw new moodle_exception(QUIZACCESS_QUIZPROCTORING_MULTIFACESDETECTED, 'quizaccess_quizproctoring', '', '');
            }
            break;
        case 'eyesnotopen':
            if (!$mainimage) {
                quizproctoring_storeimage($img, $cmid, $attemptid,
                $cm->instance, $mainimage, $service, QUIZACCESS_QUIZPROCTORING_EYESNOTOPENED);
            } else {
                throw new moodle_exception(QUIZACCESS_QUIZPROCTORING_EYESNOTOPENED, 'quizaccess_quizproctoring', '', '');
            }
            break;
        case 'Left':
            if (!$mainimage) {
                quizproctoring_storeimage($img, $cmid, $attemptid,
                $cm->instance, $mainimage, $service, QUIZACCESS_QUIZPROCTORING_LEFTMOVEDETECTED);
            } else {
                throw new moodle_exception(QUIZACCESS_QUIZPROCTORING_LEFTMOVEDETECTED, 'quizaccess_quizproctoring', '', '');
            }
            break;
        case 'Right':
            if (!$mainimage) {
                quizproctoring_storeimage($img, $cmid, $attemptid,
                $cm->instance, $mainimage, $service, QUIZACCESS_QUIZPROCTORING_RIGHTMOVEDETECTED);
            } else {
                throw new moodle_exception(QUIZACCESS_QUIZPROCTORING_RIGHTMOVEDETECTED, 'quizaccess_quizproctoring', '', '');
            }
            break;
        case 'Speaking':
            if (!$mainimage) {
                quizproctoring_storeimage($img, $cmid, $attemptid,
                $cm->instance, $mainimage, $service, QUIZACCESS_QUIZPROCTORING_SPEAKINGDETECTED);
            } else {
                throw new moodle_exception(QUIZACCESS_QUIZPROCTORING_SPEAKINGDETECTED, 'quizaccess_quizproctoring', '', '');
            }
            break;
        case 'objectsdetected':
            if (!$mainimage) {
                quizproctoring_storeimage($img, $cmid, $attemptid,
                $cm->instance, $mainimage, $service, QUIZACCESS_QUIZPROCTORING_OBJECTDETECTED);
            } else {
                throw new moodle_exception(QUIZACCESS_QUIZPROCTORING_OBJECTDETECTED, 'quizaccess_quizproctoring', '', '');
            }
            break;
    }
    die();
}