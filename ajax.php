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
 * AJAX call to save image file and make it part of moodle file.
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
global $SESSION, $USER, $DB, $CFG, $PAGE;

$img = optional_param('imgBase64', '', PARAM_RAW);
$cmid = required_param('cmid', PARAM_INT);
$attemptid = required_param('attemptid', PARAM_INT);
$mainimage = optional_param('mainimage', false, PARAM_BOOL);
$tab = optional_param('tab', false, PARAM_BOOL);
$deviceinfo = optional_param('deviceinfo', '', PARAM_TEXT);

$domainblockedresponse = function() use ($mainimage, $attemptid, $img, $cmid) {
    global $DB;

    // During a running exam attempt, do not surface the restricted-access alert.
    if (!$mainimage && !empty($attemptid)) {
        $attemptstate = $DB->get_field('quiz_attempts', 'state', ['id' => $attemptid]);
        if ($attemptstate === 'inprogress') {
            // Still store the capture quietly when "Store all images" is enabled.
            if (!empty($img)) {
                $cm = get_coursemodule_from_id('quiz', $cmid);
                if (
                    $cm &&
                    $DB->record_exists(
                        'quizaccess_quizproctoring',
                        [
                            'quizid' => $cm->instance,
                            'storeallimages' => 1,
                        ]
                    )
                ) {
                    quizproctoring_storeimage(
                        $img,
                        $cmid,
                        $attemptid,
                        $cm->instance,
                        $mainimage,
                        '',
                        '',
                        true
                    );
                }
            }
            echo json_encode(['success' => 1]);
            die();
        }
    }

    echo json_encode([
        'errorcode' => 'domainblocked',
        'error' => get_string('proctoringaccessrestricted', 'quizaccess_quizproctoring'),
    ]);
    die();
};

if (!$cm = get_coursemodule_from_id('quiz', $cmid)) {
    throw new moodle_exception('invalidcoursemodule');
}
$context = context_module::instance($cm->id);
$PAGE->set_context($context);

// Attempt-time captures only while the quiz is in progress (working mode).
if (!$mainimage) {
    $attemptstate = $DB->get_field('quiz_attempts', 'state', [
        'id' => $attemptid,
        'userid' => $USER->id,
        'quiz' => $cm->instance,
    ]);
    if ($attemptstate !== 'inprogress') {
        echo json_encode(['success' => 1]);
        die();
    }
}

$tmpdir = $CFG->dataroot . '/proctorlink';
$mainentry = quizaccess_quizproctoring_get_main_proctor($USER->id, $cm->instance, $attemptid);
if (!$mainentry || empty($mainentry->isautosubmit)) {
    if (!$img && !$tab) {
        try {
            quizproctoring_storeimage(
                $img,
                $cmid,
                $attemptid,
                $cm->instance,
                $mainimage,
                QUIZACCESS_QUIZPROCTORING_NOCAMERADETECTED,
                ''
            );
            echo json_encode(['success' => 1]);
        } catch (moodle_exception $e) {
            echo json_encode([
                'errorcode' => 1,
                'error' => $e->getMessage(),
            ]);
        }
        die();
    }

    if (!$img && $tab) {
        try {
            quizproctoring_storeimage(
                $img,
                $cmid,
                $attemptid,
                $cm->instance,
                $mainimage,
                QUIZACCESS_QUIZPROCTORING_MINIMIZEDETECTED,
                ''
            );
            echo json_encode(['success' => 1]);
        } catch (moodle_exception $e) {
            echo json_encode(['success' => 1]);
        }
        die();
    }

    $proctoringdata = $DB->get_record('quizaccess_quizproctoring', ['quizid' => $cm->instance]);
    $data = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $img));
    $target = '';
    $profileimage = '';
    if (!$mainimage) {
        // If it is not main image, get the main image data and compare.
        if ($mainentry && !empty($mainentry->userimg)) {
            $context = context_module::instance($cmid);
            $fs = get_file_storage();
            $f1 = $fs->get_file(
                $context->id,
                'quizaccess_quizproctoring',
                'cameraimages',
                $mainentry->id,
                '/',
                $mainentry->userimg
            );
            if (!$f1) {
                $imagepath = $tmpdir . '/' . $mainentry->userimg;
                if (file_exists($imagepath)) {
                    $imagedata = file_get_contents($imagepath);
                    if ($imagedata) {
                        // Detect image MIME type.
                        $extension = strtolower(pathinfo($imagepath, PATHINFO_EXTENSION));
                        $mimetype = ($extension === 'jpg' || $extension === 'jpeg') ? 'image/jpeg' : 'image/png';
                        // Fallback to fileinfo if available.
                        if (function_exists('finfo_open')) {
                            $finfo = finfo_open(FILEINFO_MIME_TYPE);
                            $detectedmime = finfo_file($finfo, $imagepath);
                            finfo_close($finfo);
                            if ($detectedmime) {
                                $mimetype = $detectedmime;
                            }
                        }
                        $target = 'data:' . $mimetype . ';base64,' . base64_encode($imagedata);
                    }
                }
            } else {
                $target = $f1->get_content();
            }
        }
    }

    if ($target === '' && !empty($proctoringdata->enableprofilematch)) {
        $profileimage = quizaccess_quizproctoring_get_user_profile_image_content($USER->id);
    }

    // Validate image.
    if ($target !== '') {
        $data = preg_replace('#^data:image/\w+;base64,#i', '', $img);
        $tdata = preg_replace('#^data:image/\w+;base64,#i', '', $target);
        $imagedata = ["primary" => $tdata, "target" => $data, "type" => "eyes_detection"];
        $response = \quizaccess_quizproctoring\api::proctor_image_api(
            $imagedata,
            $USER->id,
            $cm->instance,
            $attemptid
        );
        if (\quizaccess_quizproctoring\api::is_domain_blocked_response($response)) {
            $domainblockedresponse();
        }
        if ($response == 'Unauthorized') {
            throw new moodle_exception('tokenerror', 'quizaccess_quizproctoring');
            die();
        } else {
            if ($proctoringdata->enableeyecheck == 1) {
                $validate = \quizaccess_quizproctoring\api::validate($response, $data, $tdata, true);
            } else {
                $validate = \quizaccess_quizproctoring\api::validate($response, $data, $tdata);
            }
        }
    } else {
        $data1 = preg_replace('#^data:image/\w+;base64,#i', '', $img);
        $imagedata = ["primary" => $data1];
        $response = \quizaccess_quizproctoring\api::proctor_image_api(
            $imagedata,
            $USER->id,
            $cm->instance,
            $attemptid
        );
        if (\quizaccess_quizproctoring\api::is_domain_blocked_response($response)) {
            $domainblockedresponse();
        }
        if ($response == 'Unauthorized') {
            throw new moodle_exception('tokenerror', 'quizaccess_quizproctoring');
            die();
        } else {
            $validate = \quizaccess_quizproctoring\api::validate($response, $data1, '', true);
            if ($validate == '' && $proctoringdata->enableprofilematch == 1) {
                if ($profileimage) {
                    $imagecontent = base64_encode(preg_replace('#^data:image/\w+;base64,#i', '', $profileimage));
                    $profiledata = ["primary" => $data1, "target" => $imagecontent];
                    $matchprofile = \quizaccess_quizproctoring\api::proctor_image_api(
                        $profiledata,
                        $USER->id,
                        $cm->instance,
                        $attemptid
                    );
                    if (\quizaccess_quizproctoring\api::is_domain_blocked_response($matchprofile)) {
                        $domainblockedresponse();
                    }
                    $response = $matchprofile;
                    $profileresp = \quizaccess_quizproctoring\api::validate($matchprofile, $data1, $imagecontent, false);
                    if ($profileresp == QUIZACCESS_QUIZPROCTORING_PENDINGPROCESSING) {
                        $validate = QUIZACCESS_QUIZPROCTORING_PENDINGPROCESSING;
                    } else if (
                        $profileresp == QUIZACCESS_QUIZPROCTORING_NOFACEDETECTED ||
                        $profileresp == QUIZACCESS_QUIZPROCTORING_MULTIFACESDETECTED ||
                        $profileresp == QUIZACCESS_QUIZPROCTORING_FACESNOTMATCHED ||
                        $profileresp == QUIZACCESS_QUIZPROCTORING_FACEMASKDETECTED
                    ) {
                        throw new moodle_exception('notmatchedprofile', 'quizaccess_quizproctoring');
                        die();
                    }
                } else {
                    if (!$mainimage && !empty($attemptid)) {
                        $attemptstate = $DB->get_field('quiz_attempts', 'state', ['id' => $attemptid]);
                        if ($attemptstate === 'inprogress') {
                            echo json_encode(['success' => 1]);
                            die();
                        }
                    }
                    throw new moodle_exception('profilemandatory', 'quizaccess_quizproctoring');
                    die();
                }
            }
        }
    }

    $mainimagefailed = false;
    switch ($validate) {
        case QUIZACCESS_QUIZPROCTORING_PENDINGPROCESSING:
            if ($mainimage) {
                $mainimagefailed = true;
            } else {
                quizproctoring_storeimage(
                    $img,
                    $cmid,
                    $attemptid,
                    $cm->instance,
                    $mainimage,
                    QUIZACCESS_QUIZPROCTORING_PENDINGPROCESSING,
                    $response
                );
            }
            break;
        case QUIZACCESS_QUIZPROCTORING_NOFACEDETECTED:
            if (!$mainimage) {
                quizproctoring_storeimage(
                    $img,
                    $cmid,
                    $attemptid,
                    $cm->instance,
                    $mainimage,
                    QUIZACCESS_QUIZPROCTORING_NOFACEDETECTED,
                    $response
                );
            } else {
                throw new moodle_exception(
                    QUIZACCESS_QUIZPROCTORING_NOFACEDETECTED,
                    'quizaccess_quizproctoring',
                    '',
                    ''
                );
            }
            break;
        case QUIZACCESS_QUIZPROCTORING_MULTIFACESDETECTED:
            if (!$mainimage) {
                quizproctoring_storeimage(
                    $img,
                    $cmid,
                    $attemptid,
                    $cm->instance,
                    $mainimage,
                    QUIZACCESS_QUIZPROCTORING_MULTIFACESDETECTED,
                    $response
                );
            } else {
                throw new moodle_exception(
                    QUIZACCESS_QUIZPROCTORING_MULTIFACESDETECTED,
                    'quizaccess_quizproctoring',
                    '',
                    ''
                );
            }
            break;
        case QUIZACCESS_QUIZPROCTORING_FACESNOTMATCHED:
            if (!$mainimage) {
                quizproctoring_storeimage(
                    $img,
                    $cmid,
                    $attemptid,
                    $cm->instance,
                    $mainimage,
                    QUIZACCESS_QUIZPROCTORING_FACESNOTMATCHED,
                    $response
                );
            } else {
                throw new moodle_exception(
                    QUIZACCESS_QUIZPROCTORING_FACESNOTMATCHED,
                    'quizaccess_quizproctoring',
                    '',
                    ''
                );
            }
            break;
        case QUIZACCESS_QUIZPROCTORING_EYESNOTOPENED:
            if (!$mainimage) {
                quizproctoring_storeimage(
                    $img,
                    $cmid,
                    $attemptid,
                    $cm->instance,
                    $mainimage,
                    QUIZACCESS_QUIZPROCTORING_EYESNOTOPENED,
                    $response
                );
            } else {
                throw new moodle_exception(
                    QUIZACCESS_QUIZPROCTORING_EYESNOTOPENED,
                    'quizaccess_quizproctoring',
                    '',
                    ''
                );
            }
            break;
        case QUIZACCESS_QUIZPROCTORING_FACEMASKDETECTED:
            if (!$mainimage) {
                quizproctoring_storeimage(
                    $img,
                    $cmid,
                    $attemptid,
                    $cm->instance,
                    $mainimage,
                    QUIZACCESS_QUIZPROCTORING_FACEMASKDETECTED,
                    $response
                );
            } else {
                throw new moodle_exception(
                    QUIZACCESS_QUIZPROCTORING_FACEMASKDETECTED,
                    'quizaccess_quizproctoring',
                    '',
                    ''
                );
            }
            break;
        default:
            // Store only if main image.
            if ($mainimage) {
                quizproctoring_storemainimage(
                    $img,
                    $cmid,
                    $attemptid,
                    $cm->instance,
                    $mainimage,
                    '',
                    $response,
                    false,
                    $deviceinfo
                );
            }
            break;
    }
    if (
        ($DB->record_exists(
            'quizaccess_quizproctoring',
            [
                'quizid' => $cm->instance,
                'storeallimages' => 1,
            ]
        )) && !$mainimage && $validate === ''
    ) {
        quizproctoring_storeimage(
            $img,
            $cmid,
            $attemptid,
            $cm->instance,
            $mainimage,
            '',
            $response,
            true
        );
    }
    if ($mainimagefailed) {
        echo json_encode([
            'status' => false,
            'message' => get_string('verificationunavailable', 'quizaccess_quizproctoring'),
        ]);
    } else {
        if ($mainimage) {
            if (empty($SESSION->proctoringcheckedquizzes) || !is_array($SESSION->proctoringcheckedquizzes)) {
                $SESSION->proctoringcheckedquizzes = [];
            }
            $SESSION->proctoringcheckedquizzes[$cm->instance] = true;
        }
        echo json_encode(['status' => 'true']);
    }
    die();
}
