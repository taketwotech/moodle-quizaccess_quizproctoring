<?php
/**
 * AJAX call to save image file and make it part of moodle file
 *
 * @package    quizaccess
 * @subpackage quizproctoring
 * @copyright  2020 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
define('AJAX_SCRIPT', true);

require_once(__DIR__ . '/../../../../config.php');
require_once($CFG->dirroot . '/mod/quiz/accessrule/quizproctoring/lib.php');

$img = required_param('imgBase64', PARAM_RAW);
$cmid = required_param('cmid', PARAM_INT);
$attemptid = required_param('attemptid', PARAM_INT);
$mainimage = optional_param('mainimage', false, PARAM_BOOL);

require_login();

if (!$cm = get_coursemodule_from_id('quiz', $cmid)) {
    print_error('invalidcoursemodule');
}

$course = $DB->get_record('course', array("id" => $cm->course), '*', MUST_EXIST);
require_login($course);
$data = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $img));
$target = '';
if (!$mainimage) {
    // If it is not main image, get the main image data and compare
    if ($mainentry = $DB->get_record('quizaccess_proctor_data', array('userid' => $USER->id, 'quizid' => $cm->instance, 'image_status' => 'M' ,'attemptid' => $attemptid))) {
        $target = $mainentry->userimg;
    }
}

//validate image
\quizaccess_quizproctoring\aws\camera::init();
if ($target !== '') {
    $tdata = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $target));
    $validate = \quizaccess_quizproctoring\aws\camera::validate($data, $tdata);
} else {
    $validate = \quizaccess_quizproctoring\aws\camera::validate($data);
}
switch ($validate) {
    case QUIZACCESS_QUIZPROCTORING_NOFACEDETECTED:
        if (!$mainimage) {
            quizproctoring_storeimage($img, $cmid, $attemptid, $cm->instance, $mainimage, QUIZACCESS_QUIZPROCTORING_NOFACEDETECTED);
        } else {
            print_error(QUIZACCESS_QUIZPROCTORING_NOFACEDETECTED, 'quizaccess_quizproctoring', '', '');
        }
        break;
    case QUIZACCESS_QUIZPROCTORING_MULTIFACESDETECTED:
        if (!$mainimage) {
            quizproctoring_storeimage($img, $cmid, $attemptid, $cm->instance, $mainimage, QUIZACCESS_QUIZPROCTORING_MULTIFACESDETECTED);
        } else {
            print_error(QUIZACCESS_QUIZPROCTORING_MULTIFACESDETECTED, 'quizaccess_quizproctoring', '', '');
        }
        break;
    case QUIZACCESS_QUIZPROCTORING_FACESNOTMATCHED:
        if (!$mainimage) {
            quizproctoring_storeimage($img, $cmid, $attemptid, $cm->instance, $mainimage, QUIZACCESS_QUIZPROCTORING_FACESNOTMATCHED);
        } else {
            print_error(QUIZACCESS_QUIZPROCTORING_FACESNOTMATCHED, 'quizaccess_quizproctoring', '', '');
        }
        break;
    case QUIZACCESS_QUIZPROCTORING_EYESNOTOPENED:
        if (!$mainimage) {
            //storeimage($img, $cmid, $attemptid, $cm->instance, $mainimage, QUIZACCESS_QUIZPROCTORING_EYESNOTOPENED);
        } else {
            print_error(QUIZACCESS_QUIZPROCTORING_EYESNOTOPENED, 'quizaccess_quizproctoring', '', '');
        }
        break;
    case QUIZACCESS_QUIZPROCTORING_FACEMASKDETECTED:
        if (!$mainimage) {
            quizproctoring_storeimage($img, $cmid, $attemptid, $cm->instance, $mainimage, QUIZACCESS_QUIZPROCTORING_FACEMASKDETECTED);
        } else {
            print_error(QUIZACCESS_QUIZPROCTORING_FACEMASKDETECTED, 'quizaccess_quizproctoring', '', '');
        }
        break;
    default:
        //Store only if main image
        if ($mainimage) {
            quizproctoring_storeimage($img, $cmid, $attemptid, $cm->instance, $mainimage);
        }
         break;
}
echo json_encode(array('status' => 'true'));
die();