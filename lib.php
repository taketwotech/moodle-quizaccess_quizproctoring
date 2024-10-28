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
function quizaccess_quizproctoring_pluginfile($course, $cm, $context, $filearea, $args, $forcedownload,
    array $options=[]) {
    global $DB;
    $itemid = array_shift($args);
    $filename = array_pop($args);

    if (!$args) {
        $filepath = '/';
    } else {
        $filepath = '/' . implode('/', $args) . '/';
    }
    if (!$data = $DB->get_record("quizaccess_proctor_data", ['id' => $itemid]) && $filearea == 'identity') {
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
    global $DB, $PAGE, $OUTPUT, $USER;
    // Update main image attempt id as soon as user landed on attemp page.
    $user = $DB->get_record('user', ['id' => $USER->id], '*', MUST_EXIST);
    if ($proctoreddata = $DB->get_record('quizaccess_proctor_data', [
    'userid' => $user->id,
    'quizid' => $quizid,
    'image_status' => 'M',
    'attemptid' => 0,
    ])) {
        $proctoreddata->attemptid = $attemptid;
        $DB->update_record('quizaccess_proctor_data', $proctoreddata);
    }
    $serviceoption = get_config('quizaccess_quizproctoring', 'serviceoption');
    $interval = $DB->get_record('quizaccess_quizproctoring', ['quizid' => $quizid]);
    $PAGE->requires->js('/mod/quiz/accessrule/quizproctoring/libraries/socket.io.js', true);
    $PAGE->requires->js_init_call('M.util.js_pending', [true], true);
    $PAGE->requires->js_init_code("
    require(['quizaccess_quizproctoring/add_camera'], function(add_camera) {
        add_camera.init($cmid, false, true, $attemptid, false,
        $quizid, '$serviceoption', $interval->time_interval);
    });
    M.util.js_complete();", true);
}

/**
 * Proctoring images store
 *
 * @param string $data user image in base64
 * @param int $cmid course module id
 * @param int $attemptid attempt id
 * @param int $quizid quiz id
 * @param boolean $mainimage main image
 * @param string $service service enabled
 * @param string $status
 * @param boolean $storeallimg store images
 */
function quizproctoring_storeimage($data, $cmid, $attemptid, $quizid, $mainimage, $service, $status='', $storeallimg=false) {
    global $USER, $DB, $COURSE;

    $user = $DB->get_record('user', ['id' => $USER->id], '*', MUST_EXIST);
    // We are all good, store the image.
    if ( $mainimage ) {
        if ($qpd = $DB->get_record('quizaccess_proctor_data', [
            'userid' => $user->id,
            'quizid' => $quizid,
            'attemptid' => $attemptid,
            'image_status' => 'M',
        ])) {
            $DB->delete_records('quizaccess_proctor_data', ['id' => $qpd->id]);
        }
        if ($qpd = $DB->get_record('quizaccess_proctor_data', ['userid' => $user->id,
            'quizid' => $quizid, 'attemptid' => $attemptid, 'image_status' => 'I' ])) {
            $DB->delete_records('quizaccess_proctor_data', ['id' => $qpd->id]);
        }
    }
    $imagename = '';
    if ($data) {
        $imagename = $quizid . "_" . $attemptid . "_" . $USER->id . '_image.png';
    }

    $record = new stdClass();
    $record->userid = $user->id;
    $record->quizid = $quizid;
    $record->image_status = $mainimage ? 'I' : 'A';
    $record->aws_response = $service;
    $record->timecreated = time();
    $record->timemodified = time();
    $record->userimg = $imagename;
    $record->attemptid = $attemptid;
    $record->status = $status;
    $id = $DB->insert_record('quizaccess_proctor_data', $record);
    if (($status != '') || ($storeallimg && $status == '')) {
        if ($data) {
            $imagename = $id. "_" . $quizid . "_" . $attemptid . "_" . $USER->id . '_image.png';
        }
        $proctoreddata = $DB->get_record('quizaccess_proctor_data', ['id' => $id]);
        $proctoreddata->userimg = $imagename;
        $DB->update_record('quizaccess_proctor_data', $proctoreddata);
    }
    if ($data) {
        $tmpdir = make_temp_directory('quizaccess_quizproctoring/captured/');
        file_put_contents($tmpdir . $imagename, $data);

        $fs = get_file_storage();
        // Prepare file record object.
        $context = context_module::instance($cmid);
        $fileinfo = [
            'contextid' => $context->id,
            'component' => 'quizaccess_quizproctoring',
            'filearea' => 'cameraimages',
            'itemid' => $id,
            'filepath' => '/',
            'filename' => $imagename,
        ];
        $file = $fs->get_file($fileinfo['contextid'], $fileinfo['component'], $fileinfo['filearea'],
                $fileinfo['itemid'], $fileinfo['filepath'], $fileinfo['filename']);
        if ($file) {
            $file->delete();
        }
        $fs->create_file_from_pathname($fileinfo, $tmpdir . $imagename);
    }

    if ( !$mainimage ) {
        $quizaccessquizproctoring = $DB->get_record('quizaccess_quizproctoring', ['quizid' => $quizid]);

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
                'userid' => $user->id,
                'quizid' => $quizid,
                'attemptid' => $attemptid,
                'image_status' => 'A',
            ];
            $sql = "SELECT * from {quizaccess_proctor_data} where userid = :userid AND
            quizid = :quizid AND attemptid = :attemptid AND image_status = :image_status
            AND status IN (:param1,:param2,:param3,:param4,:param5,:param6,:param7)";
            $errorrecords = $DB->get_records_sql($sql, $inparams);

            if (count($errorrecords) >= $quizaccessquizproctoring->warning_threshold) {
                // Submit quiz.
                $attemptobj = quiz_attempt::create($attemptid);
                $attemptobj->process_finish(time(), false);
                $autosubmitdata = $DB->get_record('quizaccess_proctor_data', [
                    'userid' => $user->id,
                    'quizid' => $quizid,
                    'attemptid' => $attemptid,
                    'image_status' => 'M',
                ]);
                $autosubmitdata->isautosubmit = 1;
                $DB->update_record('quizaccess_proctor_data', $autosubmitdata);
                echo json_encode(['status' => 'true', 'redirect' => 'true',
                    'msg' => get_string('autosubmit', 'quizaccess_quizproctoring'), 'url' => $attemptobj->review_url()->out()]);
                die();
            } else {
                if ($status) {
                    $left = $quizaccessquizproctoring->warning_threshold - count($errorrecords);
                    if ($COURSE->lang == 'fr' || $COURSE->lang == 'fr_ca') {
                        if ($left == 1) {
                            $left = $left .get_string('avertissement', 'quizaccess_quizproctoring');
                        } else {
                            $left = $left .get_string('avertissements', 'quizaccess_quizproctoring');
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
            timecreated < ".$timestampdays." AND deleted = 0 AND userimg IS NOT NULL");
        foreach ($totalrecords as $record) {
            $quizobj = \quiz::create($record->quizid, $record->userid);
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
            $file = $fs->get_file($fileinfo['contextid'], $fileinfo['component'], $fileinfo['filearea'],
                $fileinfo['itemid'], $fileinfo['filepath'], $fileinfo['filename']);
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
