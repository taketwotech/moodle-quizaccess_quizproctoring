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
 * AJAX call to save image file and make it part of moodle file
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2020 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
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
$tab = optional_param('tab', false, PARAM_BOOL);

if (!$cm = get_coursemodule_from_id('quiz', $cmid)) {
    throw new moodle_exception('invalidcoursemodule');
}
$tmpdir = $CFG->dataroot . '/proctorlink';
$mainentry = $DB->get_record('quizaccess_main_proctor', [
    'userid' => $USER->id,
    'quizid' => $cm->instance,
    'image_status' => 'M',
    'attemptid' => $attemptid]);
if (!$mainentry->isautosubmit) {
    if (!$img && !$tab) {
        quizproctoring_storeimage($img, $cmid, $attemptid, $cm->instance,
                    $mainimage, QUIZACCESS_QUIZPROCTORING_NOCAMERADETECTED, '');
    }

    if (!$img && $tab) {
        quizproctoring_storeimage($img, $cmid, $attemptid, $cm->instance,
                    $mainimage, QUIZACCESS_QUIZPROCTORING_MINIMIZEDETECTED, '');
    }

    $proctoringdata = $DB->get_record('quizaccess_quizproctoring', ['quizid' => $cm->instance]);
    $data = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $img));
    $target = '';
    $profileimage = '';
    if (!$mainimage) {
        // If it is not main image, get the main image data and compare.
        if ($mainentry) {
            $context = context_module::instance($cmid);
            $fs = get_file_storage();
            $f1 = $fs->get_file($context->id, 'quizaccess_quizproctoring',
                'cameraimages', $mainentry->id, '/', $mainentry->userimg);
            if (!$f1) {
                $imagepath = $tmpdir . '/' . $mainentry->userimg;
                $imagedata = file_get_contents($imagepath);
                if ($imagedata) {
                    $target = 'data:image/png;base64,' . base64_encode($imagedata);
                }
            } else {
                $target = $f1->get_content();
            }
        }
    } else {
        if ($proctoringdata->enableprofilematch == 1 ) {
            $context = context_user::instance($USER->id);
            $sql = "SELECT * FROM {files} WHERE contextid =
            :contextid AND component = 'user' AND
            filearea = 'icon' AND itemid = 0 AND
            filepath = '/' AND filename REGEXP 'f[0-9]+\\.(jpg|jpeg|png|gif)$'
            ORDER BY timemodified, filename DESC LIMIT 1";
            $params = ['contextid' => $context->id];
            $filerecord = $DB->get_record_sql($sql, $params);
            if ($filerecord) {
                $fs = get_file_storage();
                $file = $fs->get_file(
                    $filerecord->contextid,
                    $filerecord->component,
                    $filerecord->filearea,
                    $filerecord->itemid,
                    $filerecord->filepath,
                    $filerecord->filename
                );
                $profileimage = $file->get_content();
            }
        }
    }

    // Validate image.
    if ($target !== '') {
        $data = preg_replace('#^data:image/\w+;base64,#i', '', $img);
        $tdata = preg_replace('#^data:image/\w+;base64,#i', '', $target);
        $imagedata = ["primary" => $tdata, "target" => $data, "type" => "eyes_detection"];
        $response = \quizaccess_quizproctoring\api::proctor_image_api(($imagedata),
            $USER->id, $cm->instance);
        if ($response == 'Unauthorized') {
            throw new moodle_exception('tokenerror', 'quizaccess_quizproctoring');
            die();
        } else {
            if ($proctoringdata->enableeyecheck == 1 ) {
                $validate = \quizaccess_quizproctoring\api::validate($response, $data, $tdata, true);
            } else {
                $validate = \quizaccess_quizproctoring\api::validate($response, $data, $tdata);
            }
        }
    } else {
        $data1 = preg_replace('#^data:image/\w+;base64,#i', '', $img);
        $imagedata = ["primary" => $data1];
        $response = \quizaccess_quizproctoring\api::proctor_image_api(($imagedata),
            $USER->id, $cm->instance);
        if ($response == 'Unauthorized') {
            throw new moodle_exception('tokenerror', 'quizaccess_quizproctoring');
            die();
        } else {
            $validate = \quizaccess_quizproctoring\api::validate($response, $data1, '', true);
            if ( $validate == '' && $proctoringdata->enableprofilematch == 1 ) {
                if ( $profileimage ) {
                    $imagecontent = base64_encode(preg_replace('#^data:image/\w+;base64,#i', '', $profileimage));
                    $profiledata = ["primary" => $data1, "target" => $imagecontent];
                    $matchprofile = \quizaccess_quizproctoring\api::proctor_image_api(($profiledata),
                    $USER->id, $cm->instance);
                    $response = $matchprofile;
                    $profileresp = \quizaccess_quizproctoring\api::validate($matchprofile, $data1, $imagecontent, true);
                    if ($profileresp == QUIZACCESS_QUIZPROCTORING_NOFACEDETECTED ||
                        $profileresp == QUIZACCESS_QUIZPROCTORING_MULTIFACESDETECTED ||
                        $profileresp == QUIZACCESS_QUIZPROCTORING_FACESNOTMATCHED ||
                        $profileresp == QUIZACCESS_QUIZPROCTORING_EYESNOTOPENED ||
                        $profileresp == QUIZACCESS_QUIZPROCTORING_FACEMASKDETECTED) {
                        throw new moodle_exception('notmatchedprofile', 'quizaccess_quizproctoring');
                        die();
                    }
                } else {
                    throw new moodle_exception('profilemandatory', 'quizaccess_quizproctoring');
                    die();
                }
            }
        }
    }

    switch ($validate) {
        case QUIZACCESS_QUIZPROCTORING_NOFACEDETECTED:
            if (!$mainimage) {
                quizproctoring_storeimage($img, $cmid, $attemptid, $cm->instance,
                    $mainimage,  QUIZACCESS_QUIZPROCTORING_NOFACEDETECTED, $response);
            } else {
                throw new moodle_exception(QUIZACCESS_QUIZPROCTORING_NOFACEDETECTED, 'quizaccess_quizproctoring', '', '');
            }
            break;
        case QUIZACCESS_QUIZPROCTORING_MULTIFACESDETECTED:
            if (!$mainimage) {
                quizproctoring_storeimage($img, $cmid, $attemptid, $cm->instance,
                $mainimage,  QUIZACCESS_QUIZPROCTORING_MULTIFACESDETECTED, $response);
            } else {
                throw new moodle_exception(QUIZACCESS_QUIZPROCTORING_MULTIFACESDETECTED, 'quizaccess_quizproctoring', '', '');
            }
            break;
        case QUIZACCESS_QUIZPROCTORING_FACESNOTMATCHED:
            if (!$mainimage) {
                quizproctoring_storeimage($img, $cmid, $attemptid,
                $cm->instance, $mainimage,  QUIZACCESS_QUIZPROCTORING_FACESNOTMATCHED, $response);
            } else {
                throw new moodle_exception(QUIZACCESS_QUIZPROCTORING_FACESNOTMATCHED, 'quizaccess_quizproctoring', '', '');
            }
            break;
        case QUIZACCESS_QUIZPROCTORING_EYESNOTOPENED:
            if (!$mainimage) {
                quizproctoring_storeimage($img, $cmid, $attemptid,
                $cm->instance, $mainimage,  QUIZACCESS_QUIZPROCTORING_EYESNOTOPENED, $response);
            } else {
                throw new moodle_exception(QUIZACCESS_QUIZPROCTORING_EYESNOTOPENED, 'quizaccess_quizproctoring', '', '');
            }
            break;
        case QUIZACCESS_QUIZPROCTORING_FACEMASKDETECTED:
            if (!$mainimage) {
                quizproctoring_storeimage($img, $cmid, $attemptid, $cm->instance,
                $mainimage,  QUIZACCESS_QUIZPROCTORING_FACEMASKDETECTED, $response);
            } else {
                throw new moodle_exception(QUIZACCESS_QUIZPROCTORING_FACEMASKDETECTED, 'quizaccess_quizproctoring', '', '');
            }
            break;
        default:
            // Store only if main image.
            if ($mainimage) {
                quizproctoring_storemainimage($img, $cmid, $attemptid, $cm->instance, $mainimage,  '', $response);
            }
             break;
    }
    if (($DB->record_exists('quizaccess_quizproctoring', ['quizid' => $cm->instance,
                'storeallimages' => 1])) && !$mainimage) {
        quizproctoring_storeimage($img, $cmid, $attemptid,
        $cm->instance, $mainimage,  '', $response, true);
    }
    echo json_encode(['status' => 'true']);
    die();
}
