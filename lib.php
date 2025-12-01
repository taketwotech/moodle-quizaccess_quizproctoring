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
 * library functions for quizaccess_quizproctoring plugin.
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2020 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
defined('MOODLE_INTERNAL') || die();
require_once($CFG->dirroot . '/mod/quiz/locallib.php');
use mod_quiz\quiz_attempt;

define('QUIZACCESS_QUIZPROCTORING_NOFACEDETECTED', 'nofacedetected');
define('QUIZACCESS_QUIZPROCTORING_NOCAMERADETECTED', 'nocameradetected');
define('QUIZACCESS_QUIZPROCTORING_MULTIFACESDETECTED', 'multifacesdetected');
define('QUIZACCESS_QUIZPROCTORING_FACESNOTMATCHED', 'facesnotmatched');
define('QUIZACCESS_QUIZPROCTORING_EYESNOTOPENED', 'eyesnotopened');
define('QUIZACCESS_QUIZPROCTORING_FACEMATCHTHRESHOLD', 70);
define('QUIZACCESS_QUIZPROCTORING_FACEMATCHTHRESHOLDT', 55);
define('QUIZACCESS_QUIZPROCTORING_FACEMASKDETECTED', 'facemaskdetected');
define('QUIZACCESS_QUIZPROCTORING_FACEMASKTHRESHOLD', 80);
define('QUIZACCESS_QUIZPROCTORING_COMPLETION_PASSED', 'completionpassed');
define('QUIZACCESS_QUIZPROCTORING_COMPLETION_FAILED', 'completionfailed');
define('QUIZACCESS_QUIZPROCTORING_MINIMIZEDETECTED', 'minimizedetected');
define('QUIZACCESS_QUIZPROCTORING_LEFTMOVEDETECTED', 'leftmovedetected');
define('QUIZACCESS_QUIZPROCTORING_RIGHTMOVEDETECTED', 'rightmovedetected');

/**
 * Serves the quizaccess proctoring files.
 *
 * @param stdClass $course course object
 * @param stdClass $cm course module object
 * @param stdClass $context context object
 * @param string $filearea file area
 * @param array $args extra arguments
 * @param bool $forcedownload whether or not force download
 * @param array $options additional options affecting the file serving
 * @return bool false if file not found, does not return if found - justsend the file
 */
function quizaccess_quizproctoring_pluginfile(
    $course,
    $cm,
    $context,
    $filearea,
    $args,
    $forcedownload,
    array $options = []
) {
    global $DB;
    $itemid = array_shift($args);
    $filename = array_pop($args);

    if (!$args) {
        $filepath = '/';
    } else {
        $filepath = '/' . implode('/', $args) . '/';
    }
    if (!$data = $DB->get_record("quizaccess_main_proctor", ['id' => $itemid]) && $filearea == 'identity') {
        return false;
    }

    $fs = get_file_storage();
    $file = $fs->get_file($context->id, 'quizaccess_quizproctoring', $filearea, $itemid, $filepath, $filename);
    if (!$file) {
        return false;
    }
    send_stored_file($file, 0, 0, $forcedownload, $options);
}

/**
 * Camera start on page
 *
 * @param int $cmid course module id
 * @param int $attemptid attempt id
 * @param int $quizid quiz id
 */
function quizproctoring_camera_task($cmid, $attemptid, $quizid) {
    global $DB, $PAGE, $OUTPUT, $USER, $COURSE, $SESSION;
    // Update main image attempt id as soon as user landed on attemp page.
    $user = $DB->get_record('user', ['id' => $USER->id], '*', MUST_EXIST);
    $warningsleft = 0;
    $quizaproctoring = $DB->get_record('quizaccess_quizproctoring', ['quizid' => $quizid]);
    $plugin = core_plugin_manager::instance()->get_plugin_info('quizaccess_quizproctoring');
    $SESSION->proctorlink_version = $plugin->release;

    $proctoringgrouping = $DB->get_record('groupings', ['name' => 'proctoring', 'courseid' => $COURSE->id]);
    $usergroup = '';

    if ($proctoringgrouping) {
        $sql = "SELECT g.name
                FROM {groups} g
                JOIN {groupings_groups} gg ON g.id = gg.groupid
                JOIN {groups_members} gm ON g.id = gm.groupid
                WHERE gg.groupingid = :groupingid
                AND gm.userid = :userid";
        $usergroup = $DB->get_field_sql($sql, ['groupingid' => $proctoringgrouping->id, 'userid' => $USER->id]);
    }

    if (
        $proctoreddata = $DB->get_record('quizaccess_main_proctor', [
            'userid' => $user->id,
            'quizid' => $quizid,
            'image_status' => 'M',
            'attemptid' => 0,
        ])
    ) {
        $proctoreddata->attemptid = $attemptid;
        $warningsleft = $quizaproctoring->warning_threshold;
        $DB->update_record('quizaccess_main_proctor', $proctoreddata);
    } else {
        if (isset($quizaproctoring->warning_threshold) && $quizaproctoring->warning_threshold != 0) {
            $inparams = [
                'param1' => QUIZACCESS_QUIZPROCTORING_NOFACEDETECTED,
                'param2' => QUIZACCESS_QUIZPROCTORING_MULTIFACESDETECTED,
                'param3' => QUIZACCESS_QUIZPROCTORING_FACESNOTMATCHED,
                'param4' => QUIZACCESS_QUIZPROCTORING_FACEMASKDETECTED,
                'param5' => QUIZACCESS_QUIZPROCTORING_MINIMIZEDETECTED,
                'param6' => QUIZACCESS_QUIZPROCTORING_NOCAMERADETECTED,
                'param7' => QUIZACCESS_QUIZPROCTORING_EYESNOTOPENED,
                'param8' => QUIZACCESS_QUIZPROCTORING_LEFTMOVEDETECTED,
                'param9' => QUIZACCESS_QUIZPROCTORING_RIGHTMOVEDETECTED,
                'userid' => $user->id,
                'quizid' => $quizid,
                'attemptid' => $attemptid,
                'image_status' => 'A',
            ];
            $sql = "SELECT * from {quizaccess_proctor_data} where userid = :userid AND
            quizid = :quizid AND attemptid = :attemptid AND image_status = :image_status
            AND status IN (:param1,:param2,:param3,:param4,:param5,:param6,:param7,:param8,:param9)";
            $errorrecords = $DB->get_records_sql($sql, $inparams);
            $warningsleft = $quizaproctoring->warning_threshold - count($errorrecords);
        }
    }
    $fullname = $user->id . '-' . $user->firstname . ' ' . $user->lastname;
    $securewindow = $DB->get_record('quiz', ['id' => $quizid]);

    $detectionval = null;
    if ($attemptid) {
        $attemptrecord = $DB->get_record('quizaccess_main_proctor', [
            'userid' => $USER->id,
            'quizid' => $quizid,
            'attemptid' => $attemptid,
            'image_status' => 'M'
        ], 'iseyecheck');
        if ($attemptrecord && isset($attemptrecord->iseyecheck)) {
            $detectionval = $attemptrecord->iseyecheck;
        }
    }

    if ($detectionval === null) {
        $quizspecific = get_user_preferences('eye_detection', null, $USER->id);
        if ($quizspecific !== null) {
            $detectionval = $quizspecific;
        } else {
            $globaldetectionval = get_user_preferences('eye_detection_global', null, $USER->id);
            $detectionval = $globaldetectionval;
        }
    }
    $studenthexstring = get_config('quizaccess_quizproctoring', 'quizproctoringhexstring');
    $PAGE->requires->js('/mod/quiz/accessrule/quizproctoring/libraries/socket.io.js', true);
    $PAGE->requires->js(new moodle_url('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.1/camera_utils.js'), true);
    $PAGE->requires->js(new moodle_url('https://cdn.jsdelivr.net/npm/@mediapipe/control_utils@0.1/control_utils.js'), true);
    $PAGE->requires->js(new moodle_url('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.1/drawing_utils.js'), true);
    $PAGE->requires->js(new moodle_url('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/face_mesh.js'), true);
    $PAGE->requires->js_init_call('M.util.js_pending', [true], true);
    $PAGE->requires->js_init_code("
    require(['quizaccess_quizproctoring/add_camera'], function(add_camera) {
        add_camera.init($cmid, false, true, $attemptid, false,
        $quizid,
        $quizaproctoring->enableeyecheckreal,
        '$studenthexstring',
        $quizaproctoring->enableteacherproctor,
        '$securewindow->browsersecurity',
        '$fullname',
        $quizaproctoring->enablestudentvideo,
        $quizaproctoring->time_interval,
        $warningsleft,
        $USER->id,
        '$usergroup',
        $detectionval);
    });
    M.util.js_complete();", true);
    $PAGE->requires->strings_for_js([
        'tabwarning',
        'tabwarningoneleft',
        'tabwarningmultiple',
        'nocameradetected',
        'nocameradetectedm',
    ], 'quizaccess_quizproctoring');
    $PAGE->requires->js('/mod/quiz/accessrule/quizproctoring/libraries/js/eyesdetection.min.js', true);
}

/**
 * Proctoring images store
 *
 * @param string $data user image in base64
 * @param int $cmid course module id
 * @param int $attemptid attempt id
 * @param int $quizid quiz id
 * @param boolean $mainimage main image
 * @param string $status
 * @param string $response
 * @param boolean $storeallimg store images
 */
function quizproctoring_storeimage(
    $data,
    $cmid,
    $attemptid,
    $quizid,
    $mainimage,
    $status = '',
    $response = '',
    $storeallimg = false
) {
    global $CFG, $USER, $DB, $COURSE;
    $quizaccessquizproctoring = $DB->get_record('quizaccess_quizproctoring', ['quizid' => $quizid]);
    // We are all good, store the image.
    if ($data) {
        $imagename = $USER->id . "_" . $attemptid . "_" . $quizid . "_" . time() . '_image.png';
    } else {
        $imagename = '';
    }
    $record = new stdClass();
    $record->userid = $USER->id;
    $record->quizid = $quizid;
    $record->timecreated = time();
    $record->userimg = $imagename;
    $record->attemptid = $attemptid;
    $record->status = $status;
    $record->image_status = 'A';
    $record->timemodified = time();
    $record->aws_response = 'take2';
    $record->response = $response;
    $id = $DB->insert_record('quizaccess_proctor_data', $record);

    if ($data) {
        $base64string = preg_replace('/^data:image\/\w+;base64,/', '', $data);
        $imagedata = base64_decode($base64string);
        $tmpdir = $CFG->dataroot . '/proctorlink/';
        if (!file_exists($tmpdir)) {
            mkdir($tmpdir, 0777, true);
        }
        file_put_contents($tmpdir . $imagename, $imagedata);
    }

    if (!$mainimage && $status != '') {
        $errorstring = '';
        if (isset($quizaccessquizproctoring->warning_threshold) && $quizaccessquizproctoring->warning_threshold != 0) {
            $inparams = [
                'param1' => QUIZACCESS_QUIZPROCTORING_NOFACEDETECTED,
                'param2' => QUIZACCESS_QUIZPROCTORING_MULTIFACESDETECTED,
                'param3' => QUIZACCESS_QUIZPROCTORING_FACESNOTMATCHED,
                'param4' => QUIZACCESS_QUIZPROCTORING_FACEMASKDETECTED,
                'param5' => QUIZACCESS_QUIZPROCTORING_MINIMIZEDETECTED,
                'param6' => QUIZACCESS_QUIZPROCTORING_NOCAMERADETECTED,
                'param7' => QUIZACCESS_QUIZPROCTORING_EYESNOTOPENED,
                'param8' => QUIZACCESS_QUIZPROCTORING_LEFTMOVEDETECTED,
                'param9' => QUIZACCESS_QUIZPROCTORING_RIGHTMOVEDETECTED,
                'userid' => $USER->id,
                'quizid' => $quizid,
                'attemptid' => $attemptid,
                'image_status' => 'A',
            ];
            $sql = "SELECT * from {quizaccess_proctor_data} where userid = :userid AND
            quizid = :quizid AND attemptid = :attemptid AND image_status = :image_status
            AND status IN (:param1,:param2,:param3,:param4,:param5,:param6,:param7,:param8,:param9)";
            $errorrecords = $DB->get_records_sql($sql, $inparams);

            if (count($errorrecords) >= $quizaccessquizproctoring->warning_threshold) {
                // Submit quiz.
                $attemptobj = quiz_attempt::create($attemptid);
                $attemptobj->process_finish(time(), false);
                $autosubmitdata = $DB->get_record('quizaccess_main_proctor', [
                    'userid' => $USER->id,
                    'quizid' => $quizid,
                    'attemptid' => $attemptid,
                    'image_status' => 'M',
                ]);
                $autosubmitdata->isautosubmit = 1;
                $DB->update_record('quizaccess_main_proctor', $autosubmitdata);
                echo json_encode([
                    'status' => 'true',
                    'redirect' => 'true',
                    'msg' => get_string('autosubmit', 'quizaccess_quizproctoring'),
                    'url' => $attemptobj->review_url()->out(),
                ]);
                die();
            } else {
                if ($status) {
                    $left = $quizaccessquizproctoring->warning_threshold - count($errorrecords);
                    if ($COURSE->lang == 'fr' || $COURSE->lang == 'fr_ca') {
                        if ($left == 1) {
                            $left = $left . get_string('avertissement', 'quizaccess_quizproctoring');
                        } else {
                            $left = $left . get_string('avertissements', 'quizaccess_quizproctoring');
                        }
                    } else {
                        if ($left == 1) {
                            $left = $left . get_string('warning', 'quizaccess_quizproctoring');
                        } else {
                            $left = $left . get_string('warnings', 'quizaccess_quizproctoring');
                        }
                    }
                    $errorstring = get_string('warningsleft', 'quizaccess_quizproctoring', $left);
                }

                if ($status) {
                    throw new moodle_exception($status, 'quizaccess_quizproctoring', '', $errorstring);
                    die();
                }
            }
        } else if ($quizaccessquizproctoring->warning_threshold == 0) {
            throw new moodle_exception($status, 'quizaccess_quizproctoring', '', '');
            die();
        }
    }
}

/**
 * Proctoring images store
 *
 * @param string $data user image in base64
 * @param int $cmid course module id
 * @param int $attemptid attempt id
 * @param int $quizid quiz id
 * @param boolean $mainimage main image
 * @param string $status
 * @param string $response
 * @param boolean $storeallimg store images
 */
function quizproctoring_storemainimage(
    $data,
    $cmid,
    $attemptid,
    $quizid,
    $mainimage,
    $status = '',
    $response = '',
    $storeallimg = false
) {
    global $USER, $DB, $COURSE, $CFG;

    // We are all good, store the image.
    if ($mainimage) {
        if ($qpd = $DB->get_record(
            'quizaccess_main_proctor',
            [
                'userid' => $USER->id,
                'quizid' => $quizid,
                'attemptid' => $attemptid,
                'image_status' => 'M',
            ]
        )) {
            $DB->delete_records('quizaccess_main_proctor', ['id' => $qpd->id]);
        }
        if ($qpd = $DB->get_record(
            'quizaccess_main_proctor',
            [
                'userid' => $USER->id,
                'quizid' => $quizid,
                'attemptid' => $attemptid,
                'image_status' => 'I',
            ]
        )) {
            $DB->delete_records('quizaccess_main_proctor', ['id' => $qpd->id]);
        }
        $globaleyepref = get_user_preferences('eye_detection_global', null, $USER->id);
        $eyedetectionvalue = ($globaleyepref !== null) ? $globaleyepref : 1;
        set_user_preference('eye_detection', $eyedetectionvalue, $USER->id);
    }
    $imagename = $USER->id . "_" . $attemptid . "_" . $quizid . "_" . time() . '_image.png';
    $record = new stdClass();
    $record->userid = $USER->id;
    $record->quizid = $quizid;
    $record->timecreated = time();
    $record->userimg = $imagename;
    $record->attemptid = $attemptid;
    $record->status = $status;
    $record->image_status = 'I';
    $record->timemodified = time();
    $record->aws_response = 'take2';
    $record->response = $response;
    if ($mainimage && isset($eyedetectionvalue)) {
        $record->iseyecheck = $eyedetectionvalue;
    }
    $id = $DB->insert_record('quizaccess_main_proctor', $record);

    if ($data) {
        $base64string = preg_replace('/^data:image\/\w+;base64,/', '', $data);
        $imagedata = base64_decode($base64string);

        if ($imagedata !== false) {
            $tmpdir = $CFG->dataroot . '/proctorlink';
            if (!file_exists($tmpdir)) {
                mkdir($tmpdir, 0755, true);
            }
            file_put_contents($tmpdir . '/' . $imagename, $imagedata);
        }
    }
}

/**
 * Clean Stored Images task.
 *
 * @return bool false if no record found
 */
function clean_images_task() {
    global $DB;
    $currenttime = time();
    $timedelete = get_config('quizaccess_quizproctoring', 'clear_images');
    $timestampdays = $currenttime - ($timedelete * 24 * 60 * 60);
    if ($timedelete > 0) {
        $totalrecords = $DB->get_records_sql("SELECT * FROM {quizaccess_proctor_data} where
            timecreated < " . $timestampdays . " AND deleted = 0 AND userimg IS NOT NULL");
        foreach ($totalrecords as $record) {
            $quizobj = \mod_quiz\quiz_settings::create($record->quizid, $record->userid);
            $context = $quizobj->get_context();
            $fs = get_file_storage();
            $fileinfo = [
                'contextid' => $context->id,
                'component' => 'quizaccess_quizproctoring',
                'filearea' => 'cameraimages',
                'itemid' => $record->id,
                'filepath' => '/',
                'filename' => $record->userimg,
            ];
            $file = $fs->get_file(
                $fileinfo['contextid'],
                $fileinfo['component'],
                $fileinfo['filearea'],
                $fileinfo['itemid'],
                $fileinfo['filepath'],
                $fileinfo['filename']
            );
            if ($file) {
                $file->delete();
            }

            $tmpdir = make_temp_directory('quizaccess_quizproctoring/captured/');
            $tempfilepath = $tmpdir . $record->userimg;
            if (file_exists($tempfilepath)) {
                unlink($tempfilepath);
            }
            $DB->delete_records('quizaccess_proctor_data', ['id' => $record->id]);
            mtrace('Deleting quizaccess proctor data for Id (Id :- ' . $record->id . ')');
        }
    }
}
