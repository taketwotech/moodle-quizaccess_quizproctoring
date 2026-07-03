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
require_once($CFG->libdir . '/filelib.php');
use mod_quiz\quiz_attempt;

define('QUIZACCESS_QUIZPROCTORING_NOFACEDETECTED', 'nofacedetected');
define('QUIZACCESS_QUIZPROCTORING_NOCAMERADETECTED', 'nocameradetected');
define('QUIZACCESS_QUIZPROCTORING_NOCAMERADISABLED', 'nocameradisabled');
define('QUIZACCESS_QUIZPROCTORING_NOMICROPHONEDISABLED', 'nomicrophonedisabled');
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
define('QUIZACCESS_QUIZPROCTORING_SPLITSCREENDETECTED', 'splitscreendetected');
define('QUIZACCESS_QUIZPROCTORING_LEFTMOVEDETECTED', 'leftmovedetected');
define('QUIZACCESS_QUIZPROCTORING_RIGHTMOVEDETECTED', 'rightmovedetected');
define('QUIZACCESS_QUIZPROCTORING_OBJECTDETECTED', 'objectdetected');
define('QUIZACCESS_QUIZPROCTORING_PENDINGPROCESSING', 'pendingprocessing');
define('QUIZACCESS_QUIZPROCTORING_REPROCESS_BATCH_SIZE', 80);
define('QUIZACCESS_QUIZPROCTORING_REPROCESS_TIME_BUDGET', 45);
define('QUIZACCESS_QUIZPROCTORING_REPROCESS_API_TIMEOUT', 10);
define('QUIZACCESS_QUIZPROCTORING_REPROCESS_MIN_REMAINING', 5);

/** User preference key for reporting page pagination (records per page). */
define('QUIZACCESS_QUIZPROCTORING_PREF_REPORTING_PAGINATION', 'quizaccess_quizproctoring_reporting_pagination');

/** Allowed values for reporting pagination. */
define('QUIZACCESS_QUIZPROCTORING_PAGINATION_OPTIONS', [10, 25, 50, 100]);

/**
 * Get effective reporting pagination: user preference if set, otherwise global setting.
 *
 * @return int Records per page (10, 25, 50, or 100).
 */
function quizaccess_quizproctoring_get_reporting_pagination() {
    global $USER;
    $allowed = QUIZACCESS_QUIZPROCTORING_PAGINATION_OPTIONS;
    $userpref = get_user_preferences(QUIZACCESS_QUIZPROCTORING_PREF_REPORTING_PAGINATION, null);
    if ($userpref !== null && in_array((int) $userpref, $allowed, true)) {
        return (int) $userpref;
    }
    $global = (int) get_config('quizaccess_quizproctoring', 'reporting_pagination');
    return in_array($global, $allowed, true) ? $global : 10;
}

/**
 * Save reporting pagination to user preference (used when user changes the dropdown).
 *
 * @param int $length Value to save (10, 25, 50, or 100).
 * @return bool True if value was valid and saved.
 */
function quizaccess_quizproctoring_set_reporting_pagination($length) {
    $allowed = QUIZACCESS_QUIZPROCTORING_PAGINATION_OPTIONS;
    $length = (int) $length;
    if (!in_array($length, $allowed, true)) {
        return false;
    }
    set_user_preference(QUIZACCESS_QUIZPROCTORING_PREF_REPORTING_PAGINATION, $length);
    return true;
}

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
    // Update main image attempt id as soon as user landed on attempt page.
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
                'param10' => QUIZACCESS_QUIZPROCTORING_OBJECTDETECTED,
                'param11' => QUIZACCESS_QUIZPROCTORING_NOCAMERADISABLED,
                'param12' => QUIZACCESS_QUIZPROCTORING_NOMICROPHONEDISABLED,
                'param13' => QUIZACCESS_QUIZPROCTORING_SPLITSCREENDETECTED,
                'userid' => $user->id,
                'quizid' => $quizid,
                'attemptid' => $attemptid,
                'image_status' => 'A',
            ];
            $sql = "SELECT * from {quizaccess_proctor_data} where userid = :userid AND
            quizid = :quizid AND attemptid = :attemptid AND image_status = :image_status
            AND status IN (:param1,:param2,:param3,:param4,:param5,:param6,:param7,:param8,:param9,:param10,
            :param11,:param12,:param13)";
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
            'image_status' => 'M',
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
    $PAGE->requires->js('/mod/quiz/accessrule/quizproctoring/libraries/js/audiorecord.min.js', true);
    $warningemailthreshold = isset($quizaproctoring->warning_email_threshold) ? (int)$quizaproctoring->warning_email_threshold : 0;
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
        $quizaproctoring->enablerecordaudio,
        $quizaproctoring->enableobjectdetect,
        $quizaproctoring->time_interval,
        $warningsleft,
        $USER->id,
        '$usergroup',
        $detectionval,
        $warningemailthreshold);
    });
    M.util.js_complete();", true);
    $PAGE->requires->strings_for_js([
        'tabwarning',
        'tabwarningoneleft',
        'tabwarningmultiple',
        'splitscreendetected',
        'warningsleft',
        'warning',
        'warnings',
        'nomicrophonedisabled',
        'nocameradisabled',
        'nocameradetected',
        'nocameradetectedm',
    ], 'quizaccess_quizproctoring');
}

/**
 * Compress image data to target size (15-20KB) while preserving quality for proctoring analysis.
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2020 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @param string $imagedata Binary image data
 * @param int $targetsize Target size in bytes (default 17500 = ~17.5KB)
 * @param int $maxwidth Maximum stored image width in pixels
 * @param int $maxheight Maximum stored image height in pixels
 * @return string|false Compressed JPEG image data or false on failure
 */
function quizproctoring_compress_image($imagedata, $targetsize = 17500, $maxwidth = 320, $maxheight = 240) {
    // Check if GD extension is available.
    if (!function_exists('imagecreatefromstring') || !function_exists('imagejpeg')) {
        return false;
    }

    // Create image resource from binary data.
    $sourceimage = @imagecreatefromstring($imagedata);
    if (!$sourceimage) {
        return false;
    }

    // Get original dimensions.
    $width = imagesx($sourceimage);
    $height = imagesy($sourceimage);

    // Calculate optimal dimensions for stored proctoring images.
    if ($width > $maxwidth || $height > $maxheight) {
        $ratio = min($maxwidth / $width, $maxheight / $height);
        $newwidth = (int)($width * $ratio);
        $newheight = (int)($height * $ratio);
    } else {
        $newwidth = $width;
        $newheight = $height;
    }

    // Create resized image if needed.
    if ($newwidth !== $width || $newheight !== $height) {
        $resizedimage = imagecreatetruecolor($newwidth, $newheight);
        // Convert palette images to truecolor for better quality.
        if (!imageistruecolor($sourceimage) && function_exists('imagepalettetotruecolor')) {
            $sourceimage = imagepalettetotruecolor($sourceimage);
        }
        imagecopyresampled($resizedimage, $sourceimage, 0, 0, 0, 0, $newwidth, $newheight, $width, $height);
        imagedestroy($sourceimage);
        $sourceimage = $resizedimage;
    }

    // Binary search for optimal quality to hit target size.
    $minquality = 40;
    $maxquality = 85;
    $bestquality = 70;
    $bestdata = null;
    $bestsize = PHP_INT_MAX;

    // Try to find quality that gets us close to target size.
    for ($quality = $maxquality; $quality >= $minquality; $quality -= 5) {
        ob_start();
        imagejpeg($sourceimage, null, $quality);
        $compressed = ob_get_clean();
        $size = strlen($compressed);

        if ($size <= $targetsize) {
            // We found a quality that meets our target.
            imagedestroy($sourceimage);
            return $compressed;
        }

        // Track the closest match.
        if ($size < $bestsize && $size > $targetsize * 0.8) {
            $bestsize = $size;
            $bestquality = $quality;
            $bestdata = $compressed;
        }
    }

    // If we couldn't hit target, use the best we found.
    if ($bestdata !== null) {
        imagedestroy($sourceimage);
        return $bestdata;
    }

    // Fallback: use quality 65.
    ob_start();
    imagejpeg($sourceimage, null, 65);
    $compressed = ob_get_clean();
    imagedestroy($sourceimage);
    return $compressed;
}

/**
 * Proctoring images store.
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2020 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @param string $data User image in base64 format
 * @param int $cmid Course module id
 * @param int $attemptid Attempt id
 * @param int $quizid Quiz id
 * @param boolean $mainimage Main image flag
 * @param string $status Status string
 * @param string $response Response string
 * @param boolean $storeallimg Store all images flag
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

    // When the client signals camera/microphone being manually disabled
    // (and no image was sent), store configured fallback icon as evidence.
    if (empty($data) && $status === QUIZACCESS_QUIZPROCTORING_NOCAMERADISABLED) {
        $pixfile = $CFG->dirroot . '/mod/quiz/accessrule/quizproctoring/pix/cameradisabled.png';
        if (file_exists($pixfile)) {
            $pixbytes = file_get_contents($pixfile);
            if ($pixbytes !== false) {
                $data = 'data:image/png;base64,' . base64_encode($pixbytes);
            }
        }
    } else if (empty($data) && $status === QUIZACCESS_QUIZPROCTORING_NOMICROPHONEDISABLED) {
        $pixfile = $CFG->dirroot . '/mod/quiz/accessrule/quizproctoring/pix/microphonedisabled.png';
        if (file_exists($pixfile)) {
            $pixbytes = file_get_contents($pixfile);
            if ($pixbytes !== false) {
                $data = 'data:image/png;base64,' . base64_encode($pixbytes);
            }
        }
    }
    // We are all good, store the image.
    if ($data) {
        $imagename = $USER->id . "_" . $attemptid . "_" . $quizid . "_" . time() . '_image.jpg';
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

        // Compress image to target size (15-20KB).
        $compresseddata = quizproctoring_compress_image($imagedata, 17500);
        if ($compresseddata === false) {
            // Fallback to original if compression fails.
            $compresseddata = $imagedata;
        }

        $tmpdir = $CFG->dataroot . '/proctorlink/';
        if (!file_exists($tmpdir)) {
            check_dir_exists($tmpdir, true, true);
        }
        file_put_contents($tmpdir . $imagename, $compresseddata);
    }

    if (!$mainimage && $status != '' && $status !== QUIZACCESS_QUIZPROCTORING_PENDINGPROCESSING) {
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
                'param10' => QUIZACCESS_QUIZPROCTORING_OBJECTDETECTED,
                'param11' => QUIZACCESS_QUIZPROCTORING_NOCAMERADISABLED,
                'param12' => QUIZACCESS_QUIZPROCTORING_NOMICROPHONEDISABLED,
                'param13' => QUIZACCESS_QUIZPROCTORING_SPLITSCREENDETECTED,
                'userid' => $USER->id,
                'quizid' => $quizid,
                'attemptid' => $attemptid,
                'image_status' => 'A',
            ];
            $sql = "SELECT * from {quizaccess_proctor_data} where userid = :userid AND
            quizid = :quizid AND attemptid = :attemptid AND image_status = :image_status
            AND status IN (:param1,:param2,:param3,:param4,:param5,:param6,:param7,:param8,:param9,:param10,
            :param11,:param12,:param13)";
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
 * Store a realtime violation and return a JSON payload instead of throwing to the client.
 *
 * quizproctoring_storeimage() throws moodle_exception for warnings; realtime AJAX must
 * receive errorcode/error JSON so the attempt page can show alert popups.
 *
 * @param string $data image data URL or empty
 * @param int $cmid course module id
 * @param int $attemptid attempt id
 * @param int $quizid quiz id
 * @param bool $mainimage main image flag
 * @param string $status violation status constant
 * @param string $response API response text
 * @param bool $eyecheckon whether eye check is active (eyesnotopen only)
 * @return array|null response array to json_encode, or null if store finished without alert
 */
function quizproctoring_storeimage_realtime_response(
    $data,
    $cmid,
    $attemptid,
    $quizid,
    $mainimage,
    $status,
    $response = '',
    $eyecheckon = false
) {
    try {
        quizproctoring_storeimage($data, $cmid, $attemptid, $quizid, $mainimage, $status, $response);
    } catch (moodle_exception $e) {
        $payload = [
            'errorcode' => 1,
            'error' => $e->getMessage(),
        ];
        if ($eyecheckon && $status === QUIZACCESS_QUIZPROCTORING_EYESNOTOPENED) {
            $payload['status'] = 'eyecheckon';
        }
        return $payload;
    }
    return null;
}

/**
 * Schedule an adhoc task to send a warning email to course teachers.
 *
 * This helper creates a task with all required context. It does not send
 * any email itself and returns immediately after queuing the task.
 *
 * @param int $courseid Course id
 * @param int $cmid Course module id
 * @param int $quizid Quiz id
 * @param int $userid User id (student)
 * @param int $attemptid Attempt id
 * @param int $warningcount Total warnings recorded
 */
function quizaccess_quizproctoring_schedule_warning_email(
    $courseid,
    $cmid,
    $quizid,
    $userid,
    $attemptid,
    $warningcount
) {
    global $DB;

    // Only one warning email per user/quiz/attempt. Check and claim before queueing
    // so duplicate AJAX calls (e.g. double visibility events) do not queue multiple tasks.
    $mainproctor = $DB->get_record('quizaccess_main_proctor', [
        'userid' => (int)$userid,
        'quizid' => (int)$quizid,
        'attemptid' => (int)$attemptid,
        'image_status' => 'M',
    ]);
    if ($mainproctor && !empty($mainproctor->warningemailtriggered)) {
        return; // Already triggered for this attempt; do not queue again.
    }

    // Claim this attempt so a concurrent request will not queue a second task.
    if ($mainproctor) {
        $mainproctor->warningemailtriggered = 1;
        $DB->update_record('quizaccess_main_proctor', $mainproctor);
    }

    $task = new \quizaccess_quizproctoring\task\warning_email_task();
    $data = new stdClass();
    $data->courseid = (int)$courseid;
    $data->cmid = (int)$cmid;
    $data->quizid = (int)$quizid;
    $data->userid = (int)$userid;
    $data->attemptid = (int)$attemptid;
    $data->warningcount = (int)$warningcount;
    $task->set_custom_data($data);
    \core\task\manager::queue_adhoc_task($task);
}

/**
 * Proctoring images store.
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2020 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @param string $data User image in base64 format
 * @param int $cmid Course module id
 * @param int $attemptid Attempt id
 * @param int $quizid Quiz id
 * @param boolean $mainimage Main image flag
 * @param string $status Status string
 * @param string $response Response string
 * @param boolean $storeallimg Store all images flag
 * @param string $deviceinfo Device information string
 */
function quizproctoring_storemainimage(
    $data,
    $cmid,
    $attemptid,
    $quizid,
    $mainimage,
    $status = '',
    $response = '',
    $storeallimg = false,
    $deviceinfo = ''
) {
    global $USER, $DB, $COURSE, $CFG;

    // We are all good, store the image.
    if ($mainimage) {
        if (
            $qpd = $DB->get_record(
                'quizaccess_main_proctor',
                [
                    'userid' => $USER->id,
                    'quizid' => $quizid,
                    'attemptid' => $attemptid,
                    'image_status' => 'M',
                ]
            )
        ) {
            $DB->delete_records('quizaccess_main_proctor', ['id' => $qpd->id]);
        }
        if (
            $qpd = $DB->get_record(
                'quizaccess_main_proctor',
                [
                    'userid' => $USER->id,
                    'quizid' => $quizid,
                    'attemptid' => $attemptid,
                    'image_status' => 'I',
                ]
            )
        ) {
            $DB->delete_records('quizaccess_main_proctor', ['id' => $qpd->id]);
        }
        $globaleyepref = get_user_preferences('eye_detection_global', null, $USER->id);
        $eyedetectionvalue = ($globaleyepref !== null) ? $globaleyepref : 1;
        set_user_preference('eye_detection', $eyedetectionvalue, $USER->id);
    }
    $imagename = $USER->id . "_" . $attemptid . "_" . $quizid . "_" . time() . '_image.jpg';
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
        if ((int)$eyedetectionvalue === 0) {
            $record->iseyedisabledbyteacher = 1;
        }
    }
    // Store device information if provided.
    if (!empty($deviceinfo)) {
        $record->deviceinfo = $deviceinfo;
    }
    $id = $DB->insert_record('quizaccess_main_proctor', $record);

    if ($data) {
        $base64string = preg_replace('/^data:image\/\w+;base64,/', '', $data);
        $imagedata = base64_decode($base64string);

        if ($imagedata !== false) {
            // Compress image to target size (15-20KB).
            $compresseddata = quizproctoring_compress_image($imagedata, 17500);
            if ($compresseddata === false) {
                // Fallback to original if compression fails.
                $compresseddata = $imagedata;
            }

            $tmpdir = $CFG->dataroot . '/proctorlink';
            if (!file_exists($tmpdir)) {
                check_dir_exists($tmpdir, true, true);
            }
            file_put_contents($tmpdir . '/' . $imagename, $compresseddata);
        }
    }
}

/**
 * Count images awaiting API reprocessing for a quiz.
 *
 * @param int $quizid Quiz id
 * @param int|null $userid Optional user id to limit the count
 * @param int|null $attemptid Optional attempt id to limit the count
 * @return int Number of pending images
 */
function quizaccess_quizproctoring_count_pending_images($quizid, $userid = null, $attemptid = null) {
    global $DB;
    $conditions = [
        'quizid' => $quizid,
        'status' => QUIZACCESS_QUIZPROCTORING_PENDINGPROCESSING,
        'deleted' => 0,
    ];
    if ($userid !== null) {
        $conditions['userid'] = $userid;
    }
    if ($attemptid !== null) {
        $conditions['attemptid'] = $attemptid;
    }
    $count = $DB->count_records('quizaccess_proctor_data', $conditions);
    $count += $DB->count_records('quizaccess_main_proctor', $conditions);
    return $count;
}

/**
 * Reprocess a single pending image record through the face detection API.
 *
 * @param stdClass $record Image record from quizaccess_proctor_data or quizaccess_main_proctor
 * @param string $tablename Database table name for the record
 * @return array Result with keys status (processed|pending|failed) and recordid
 */
function quizaccess_quizproctoring_reprocess_image($record, $tablename = 'quizaccess_proctor_data') {
    global $DB, $CFG;

    if (empty($record->userimg)) {
        return ['status' => 'failed', 'recordid' => $record->id];
    }

    $tmpdir = $CFG->dataroot . '/proctorlink/';
    $imagepath = $tmpdir . $record->userimg;
    if (!file_exists($imagepath)) {
        return ['status' => 'failed', 'recordid' => $record->id];
    }

    $imagedata = file_get_contents($imagepath);
    if ($imagedata === false) {
        return ['status' => 'failed', 'recordid' => $record->id];
    }

    $data1 = base64_encode($imagedata);
    $proctoringdata = $DB->get_record('quizaccess_quizproctoring', ['quizid' => $record->quizid]);
    $target = '';
    $mainentry = $DB->get_record('quizaccess_main_proctor', [
        'userid' => $record->userid,
        'quizid' => $record->quizid,
        'image_status' => 'M',
        'attemptid' => $record->attemptid,
        'deleted' => 0,
    ]);
    if ($mainentry && !empty($mainentry->userimg) && $mainentry->id != $record->id) {
        $mainpath = $tmpdir . $mainentry->userimg;
        if (file_exists($mainpath)) {
            $target = base64_encode(file_get_contents($mainpath));
        }
    }

    if ($target !== '') {
        $apidata = ['primary' => $target, 'target' => $data1, 'type' => 'eyes_detection'];
        $response = \quizaccess_quizproctoring\api::proctor_image_api(
            $apidata,
            $record->userid,
            $record->quizid,
            $record->attemptid,
            QUIZACCESS_QUIZPROCTORING_REPROCESS_API_TIMEOUT
        );
        if ($proctoringdata && $proctoringdata->enableeyecheck == 1) {
            $validate = \quizaccess_quizproctoring\api::validate($response, $data1, $target, true);
        } else {
            $validate = \quizaccess_quizproctoring\api::validate($response, $data1, $target);
        }
    } else {
        $apidata = ['primary' => $data1];
        $response = \quizaccess_quizproctoring\api::proctor_image_api(
            $apidata,
            $record->userid,
            $record->quizid,
            $record->attemptid,
            QUIZACCESS_QUIZPROCTORING_REPROCESS_API_TIMEOUT
        );
        $validate = \quizaccess_quizproctoring\api::validate($response, $data1, '', true);
    }

    if ($response === 'Unauthorized') {
        return ['status' => 'failed', 'recordid' => $record->id, 'reason' => 'unauthorized'];
    }

    if ($validate === QUIZACCESS_QUIZPROCTORING_PENDINGPROCESSING) {
        return ['status' => 'pending', 'recordid' => $record->id];
    }

    $record->status = $validate;
    $record->response = $response;
    $record->timemodified = time();
    $DB->update_record($tablename, $record);

    return ['status' => 'processed', 'recordid' => $record->id, 'result' => $validate];
}

/**
 * Reprocess pending images for a quiz in batches.
 *
 * Processes up to $limit images per call, stopping early when the time budget is reached.
 *
 * @param int $quizid Quiz id
 * @param int|null $limit Maximum number of images to process in this batch
 * @param int|null $userid Optional user id to limit reprocessing
 * @param int|null $attemptid Optional attempt id to limit reprocessing
 * @return array Summary with processed, pending, failed and timedout counts
 */
function quizaccess_quizproctoring_reprocess_pending_images($quizid, $limit = null, $userid = null, $attemptid = null) {
    global $DB;

    if ($limit === null) {
        $limit = QUIZACCESS_QUIZPROCTORING_REPROCESS_BATCH_SIZE;
    }
    $limit = max(1, (int) $limit);

    $results = ['processed' => 0, 'pending' => 0, 'failed' => 0, 'timedout' => false];
    $starttime = microtime(true);
    $timebudget = QUIZACCESS_QUIZPROCTORING_REPROCESS_TIME_BUDGET;

    $params = [
        'quizid' => $quizid,
        'status' => QUIZACCESS_QUIZPROCTORING_PENDINGPROCESSING,
    ];
    $select = 'quizid = :quizid AND status = :status AND deleted = 0';
    if ($userid !== null) {
        $select .= ' AND userid = :userid';
        $params['userid'] = $userid;
    }
    if ($attemptid !== null) {
        $select .= ' AND attemptid = :attemptid';
        $params['attemptid'] = $attemptid;
    }

    $processrecords = function(array $records, string $tablename = 'quizaccess_proctor_data')
            use (&$results, $starttime, $timebudget): bool {
        foreach ($records as $record) {
            $remainingtime = $timebudget - (microtime(true) - $starttime);
            if ($remainingtime < QUIZACCESS_QUIZPROCTORING_REPROCESS_MIN_REMAINING) {
                $results['timedout'] = true;
                return false;
            }
            $result = quizaccess_quizproctoring_reprocess_image($record, $tablename);
            $results[$result['status']]++;
            if ((microtime(true) - $starttime) >= $timebudget) {
                $results['timedout'] = true;
                return false;
            }
        }
        return true;
    };

    $records = $DB->get_records_select(
        'quizaccess_proctor_data',
        $select,
        $params,
        'id ASC',
        '*',
        0,
        $limit
    );
    if (!$processrecords($records)) {
        return $results;
    }

    $remaininglimit = $limit - count($records);
    if ($remaininglimit > 0 && !$results['timedout']) {
        $mainrecords = $DB->get_records_select(
            'quizaccess_main_proctor',
            $select,
            $params,
            'id ASC',
            '*',
            0,
            $remaininglimit
        );
        $processrecords($mainrecords, 'quizaccess_main_proctor');
    }

    return $results;
}

/**
 * Clean Stored Images task.
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2020 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @return bool False if no record found
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

/**
 * ProctorLink pricing page URL.
 */
define('QUIZACCESS_QUIZPROCTORING_PRICING_URL', 'https://proctorlink.com/#pricing');

/**
 * Get stored plan display data from plugin config.
 *
 * @return array
 */
function quizaccess_quizproctoring_get_plan_display() {
    $raw = get_config('quizaccess_quizproctoring', 'getplandisplay');
    if (empty($raw)) {
        return [];
    }
    $display = json_decode($raw, true);
    return is_array($display) ? $display : [];
}

/**
 * Build a pricing-page action link from the backend display action key.
 *
 * @param string $action Backend action key (upgrade, renew, purchase, buycredit).
 * @return string HTML link or empty string.
 */
function quizaccess_quizproctoring_plan_action_link($action) {
    $action = strtolower((string)$action);
    $linktext = '';
    switch ($action) {
        case 'upgrade':
            $linktext = get_string('upgradeplan', 'quizaccess_quizproctoring');
            break;
        case 'renew':
            $linktext = get_string('renewplan', 'quizaccess_quizproctoring');
            break;
        case 'purchase':
            $linktext = get_string('purchaseplan', 'quizaccess_quizproctoring');
            break;
        case 'buyCredits':
            $linktext = get_string('buycredit', 'quizaccess_quizproctoring');
            break;
        default:
            return '';
    }

    return html_writer::link(
        QUIZACCESS_QUIZPROCTORING_PRICING_URL,
        $linktext,
        ['target' => '_blank', 'rel' => 'noopener noreferrer']
    );
}

/**
 * Build the plan status note shown below the plan summary.
 *
 * @param string $refreshlink Refresh plan HTML link.
 * @param bool $iscredit Whether the active plan is credit-based.
 * @return string
 */
function quizaccess_quizproctoring_plan_status_note($refreshlink, $iscredit = false) {
    $notestring = $iscredit ? 'creditbalanceupdatenote' : 'updatenote';
    return '<div class="plan-info-note">' . get_string($notestring, 'quizaccess_quizproctoring') .
        ' <span class="plan-separator">|</span> <span class="plan-refresh-link">' . $refreshlink . '</span></div>';
}

/**
 * Whether the stored plan is credit-based.
 *
 * @param array $display Stored display data.
 * @return bool
 */
function quizaccess_quizproctoring_is_credit_plan(array $display) {
    if (($display['planType'] ?? '') === 'credit') {
        return true;
    }
    $planname = strtolower((string)get_config('quizaccess_quizproctoring', 'getplanname'));
    return $planname === 'credit' || $planname === 'credit base plan' || $planname === 'credit-based';
}

/**
 * Resolve remaining and total credits from display data with config fallback.
 *
 * @param array $display Stored display data.
 * @return array{0:int,1:int} [remaining, total]
 */
function quizaccess_quizproctoring_get_plan_credits(array $display) {
    $remaining = (int)get_config('quizaccess_quizproctoring', 'getplancredits');
    $total = (int)get_config('quizaccess_quizproctoring', 'getplantotalcredits');
    if (isset($display['remainingCredits']) || isset($display['totalCredits'])) {
        $remaining = (int)($display['remainingCredits'] ?? $remaining);
        $total = (int)($display['totalCredits'] ?? $total);
    }
    return [$remaining, $total];
}

/**
 * Build plan status HTML for the quiz settings form.
 *
 * @param string $refreshlink Refresh plan HTML link.
 * @return string
 */
function quizaccess_quizproctoring_build_plan_status_html($refreshlink) {
    $planresponseempty = (int)get_config('quizaccess_quizproctoring', 'getplanresponseempty');
    $planinfo = (int)get_config('quizaccess_quizproctoring', 'getplaninfo');
    $display = quizaccess_quizproctoring_get_plan_display();

    if ($planresponseempty === 1) {
        $box = '<div class="plan-warning-box"><strong>' .
            get_string('noplanresponse', 'quizaccess_quizproctoring') . '</strong>';
        $link = quizaccess_quizproctoring_plan_action_link('purchase');
        if ($link !== '') {
            $box .= '<span class="plan-separator">|</span> ' . $link;
        }
        $box .= '</div>';
        return $box . quizaccess_quizproctoring_plan_status_note($refreshlink);
    }

    if ($planinfo === 1) {
        if (quizaccess_quizproctoring_is_credit_plan($display)) {
            [$plancredits, $plantotalcredits] = quizaccess_quizproctoring_get_plan_credits($display);
            $activeplan = $display['activePlan'] ?? get_string('creditbaseplan', 'quizaccess_quizproctoring');
            $parts = [
                '<strong>' . get_string('activeplan', 'quizaccess_quizproctoring') . '</strong> ' . s($activeplan),
                '<strong>' . get_string('creditsremaining', 'quizaccess_quizproctoring') . '</strong> ' .
                $plancredits . '/' . $plantotalcredits,
            ];
            $line = implode(' <span class="plan-separator">|</span> ', $parts);
            $actionlink = quizaccess_quizproctoring_plan_action_link($display['action'] ?? 'buycredits');
            if ($actionlink !== '') {
                $line .= ' <span class="plan-separator">|</span> ' . $actionlink;
            }
            return '<div class="plan-info-box">' . $line . '</div>' .
                quizaccess_quizproctoring_plan_status_note($refreshlink, true);
        }

        $parts = [];
        $activeplan = $display['activePlan'] ?? get_config('quizaccess_quizproctoring', 'getplanname');
        if (!empty($activeplan)) {
            $parts[] = '<strong>' . get_string('activeplan', 'quizaccess_quizproctoring') . '</strong> ' .
                s($activeplan);
        }

        if (!empty($display['showSessionData'])) {
            $remaining = (int)($display['remainingSessions'] ?? 0);
            $total = (int)($display['totalSessions'] ?? 0);
            $parts[] = '<strong>' . get_string('sessionsremaining', 'quizaccess_quizproctoring') . '</strong> ' .
                $remaining . '/' . $total;
        }

        if (!empty($display['expiryDate'])) {
            $parts[] = '<strong>' . get_string('expirydate', 'quizaccess_quizproctoring') . '</strong> ' .
                s($display['expiryDate']);
        } else {
            $expiretimestamp = (int)get_config('quizaccess_quizproctoring', 'getplanexpiry');
            if ($expiretimestamp > 0) {
                if ($expiretimestamp > 9999999999) {
                    $expiretimestamp = (int)($expiretimestamp / 1000);
                }
                $parts[] = '<strong>' . get_string('expirydate', 'quizaccess_quizproctoring') . '</strong> ' .
                    ltrim(userdate($expiretimestamp, '%d %B %Y'), '0');
            }
        }

        $line = implode(' <span class="plan-separator">|</span> ', $parts);
        $actionlink = quizaccess_quizproctoring_plan_action_link($display['action'] ?? '');
        if ($actionlink !== '') {
            $line .= ' <span class="plan-separator">|</span> ' . $actionlink;
        }

        return '<div class="plan-info-box">' . $line . '</div>' .
            quizaccess_quizproctoring_plan_status_note($refreshlink);
    }

    $box = '<div class="plan-warning-box"><strong>' .
        get_string('noactiveplan', 'quizaccess_quizproctoring') . '</strong>';
    $action = $display['action'] ?? 'renew';
    if (($display['planType'] ?? '') === 'free') {
        $action = 'upgrade';
    } else if (quizaccess_quizproctoring_is_credit_plan($display)) {
        $action = $display['action'] ?? 'buycredits';
    }
    $link = quizaccess_quizproctoring_plan_action_link($action);
    if ($link !== '') {
        $box .= '<span class="plan-separator">|</span> ' . $link;
    }
    $box .= '</div>';
    return $box . quizaccess_quizproctoring_plan_status_note($refreshlink);
}

/**
 * Store plan display data returned by the ProctorLink API.
 *
 * @param array $data Decoded API response.
 * @return void
 */
function quizaccess_quizproctoring_store_plan_display(array $data) {
    if (!empty($data['display']) && is_array($data['display'])) {
        set_config('getplandisplay', json_encode($data['display']), 'quizaccess_quizproctoring');
        return;
    }
    unset_config('getplandisplay', 'quizaccess_quizproctoring');
}

/**
 * Sync ProctorLink plan details from the remote API into plugin config.
 *
 * @return bool True when plan data was fetched and stored successfully.
 */
function quizaccess_quizproctoring_sync_plan_from_api() {
    try {
        $planresponse = \quizaccess_quizproctoring\api::getplaninfo();
        if (empty($planresponse)) {
            set_config('getplanresponseempty', 1, 'quizaccess_quizproctoring');
            set_config('getplaninfo', 0, 'quizaccess_quizproctoring');
            set_config('getplanname', '', 'quizaccess_quizproctoring');
            unset_config('getplandisplay', 'quizaccess_quizproctoring');
            return false;
        }

        $data = json_decode($planresponse, true);
        if (!is_array($data)) {
            return false;
        }

        quizaccess_quizproctoring_store_plan_display($data);

        $plantype = isset($data['plan']['planType']) ? $data['plan']['planType'] : '';
        $planactive = !empty($data['plan']['active']);
        if (!empty($plantype)) {
            set_config('getplanresponseempty', 0, 'quizaccess_quizproctoring');
        } else {
            set_config('getplanresponseempty', 1, 'quizaccess_quizproctoring');
            unset_config('getplandisplay', 'quizaccess_quizproctoring');
        }

        if ($plantype === 'credit') {
            $credits = isset($data['plan']['details']['credits']) ? (int)$data['plan']['details']['credits'] : 0;
            $totalcreditsbought = 0;
            if (isset($data['plan']['details']['creditHistory']) && is_array($data['plan']['details']['creditHistory'])) {
                foreach ($data['plan']['details']['creditHistory'] as $history) {
                    if (isset($history['creditsBought'])) {
                        $totalcreditsbought += (int)$history['creditsBought'];
                    }
                }
            }
            if (isset($data['display']['remainingCredits']) || isset($data['display']['totalCredits'])) {
                $credits = (int)($data['display']['remainingCredits'] ?? $credits);
                $totalcreditsbought = (int)($data['display']['totalCredits'] ?? $totalcreditsbought);
            }

            $expiretimestamp = null;
            if (isset($data['plan']['details']['expireDate'])) {
                $expiretimestamp = (int)$data['plan']['details']['expireDate'];
            } else if (isset($data['plan']['details']['expiryDate'])) {
                $expiretimestamp = (int)$data['plan']['details']['expiryDate'];
            } else if (isset($data['display']['expiryTimestamp'])) {
                $expiretimestamp = (int)$data['display']['expiryTimestamp'];
            }
            if ($expiretimestamp !== null && $expiretimestamp > 9999999999) {
                $expiretimestamp = (int)($expiretimestamp / 1000);
            }

            set_config('getplancredits', $credits, 'quizaccess_quizproctoring');
            set_config('getplantotalcredits', $totalcreditsbought, 'quizaccess_quizproctoring');
            set_config('getplanexpiry', $expiretimestamp ?? 0, 'quizaccess_quizproctoring');

            $expired = $expiretimestamp !== null && $expiretimestamp < time();
            $planname = $data['display']['activePlan'] ?? $data['plan']['planName'] ?? 'credit';
            if ($credits >= 0 && $planactive && !$expired) {
                set_config('getplaninfo', 1, 'quizaccess_quizproctoring');
                set_config('getplanname', $planname, 'quizaccess_quizproctoring');
            } else {
                set_config('getplaninfo', 0, 'quizaccess_quizproctoring');
                set_config('getplanname', $planname, 'quizaccess_quizproctoring');
            }
            return true;
        }

        $expiretimestamp = null;
        if (isset($data['plan']['details']['expiryDate'])) {
            $expiretimestamp = (int)$data['plan']['details']['expiryDate'];
        } else if (isset($data['plan']['details']['expireDate'])) {
            $expiretimestamp = (int)$data['plan']['details']['expireDate'];
        } else if (isset($data['display']['expiryTimestamp'])) {
            $expiretimestamp = (int)$data['display']['expiryTimestamp'];
        }

        set_config('getplancredits', 0, 'quizaccess_quizproctoring');
        set_config('getplantotalcredits', 0, 'quizaccess_quizproctoring');

        if ($expiretimestamp !== null) {
            if ($expiretimestamp > 9999999999) {
                $expiretimestamp = (int)($expiretimestamp / 1000);
            }
            $expired = $expiretimestamp < time();
            set_config('getplanexpiry', $expiretimestamp, 'quizaccess_quizproctoring');
            if ($planactive && !$expired) {
                set_config('getplaninfo', 1, 'quizaccess_quizproctoring');
                if (!empty($data['plan']['planName'])) {
                    set_config('getplanname', $data['plan']['planName'], 'quizaccess_quizproctoring');
                }
            } else {
                set_config('getplaninfo', 0, 'quizaccess_quizproctoring');
                set_config('getplanname', $data['plan']['planName'] ?? '', 'quizaccess_quizproctoring');
            }
            return true;
        }

        if ($planactive && !empty($data['plan']['planName'])) {
            set_config('getplanexpiry', 0, 'quizaccess_quizproctoring');
            set_config('getplaninfo', 1, 'quizaccess_quizproctoring');
            set_config('getplanname', $data['plan']['planName'], 'quizaccess_quizproctoring');
            return true;
        }

        set_config('getplanexpiry', 0, 'quizaccess_quizproctoring');
        set_config('getplaninfo', 0, 'quizaccess_quizproctoring');
        set_config('getplanname', '', 'quizaccess_quizproctoring');
        return false;
    } catch (Exception $e) {
        return false;
    }
}
