<?php
/**
 * library functions for quizaccess_proctoring plugin.
 *
 * @package    quizaccess
 * @subpackage proctoring
 * @copyright  2020 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once($CFG->dirroot . '/mod/quiz/locallib.php');

define('QUIZACCESS_PROCTORING_NOFACEDETECTED', 'nofacedetected');
define('QUIZACCESS_PROCTORING_MULTIFACESDETECTED', 'multifacesdetected');
define('QUIZACCESS_PROCTORING_FACESNOTMATCHED', 'facesnotmatched');
define('QUIZACCESS_PROCTORING_EYESNOTOPENED', 'eyesnotopened');
define('QUIZACCESS_PROCTORING_FACEMATCHTHRESHOLD', 90);
define('QUIZACCESS_PROCTORING_FACEMASKDETECTED', 'facemaskdetected');
define('QUIZACCESS_PROCTORING_FACEMASKTHRESHOLD', 80);
define('QUIZACCESS_PROCTORING_COMPLETION_PASSED', 'completionpassed');
define('QUIZACCESS_PROCTORING_COMPLETION_FAILED', 'completionfailed');

/**
 * Serves the quizaccess proctoring files.
 *
 * @package  quizaccess_proctoring
 * @category files
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
    array $options=array()) {
    global $DB;
    $itemid = array_shift($args);
    $relativepath = implode('/', $args);
    if (!$data = $DB->get_record("quizaccess_proctoring_data", array('id' => $itemid)) && $filearea == 'identity') {
        return false;
    }

    $fs = get_file_storage();
    $fullpath = "/$context->id/quizaccess_quizproctoring/$filearea/$itemid/$relativepath";
    if (!$file = $fs->get_file_by_hash(sha1($fullpath)) or $file->is_directory()) {
        return false;
    }
    send_stored_file($file, 0, 0, $forcedownload, $options);
}

function quizaccess_quizproctoring_camera_task_start($cmid, $attemptid, $quizid) {
    global $DB, $PAGE, $OUTPUT, $USER;
    // Update main image attempt id as soon as user landed on attemp page.
    $user = $DB->get_record('user', array('id' => $USER->id), '*', MUST_EXIST);
    if ($proctored_data = $DB->get_record('quizaccess_proctoring_data', array('userid' => $user->id, 'quizid' => $quizid, 'image_status' => 'M', 'attemptid' => 0))) {
        $proctored_data->attemptid = $attemptid;
        $DB->update_record('quizaccess_proctoring_data', $proctored_data);
    }
    $interval = $DB->get_record('quizaccess_proctoring',array('quizid'=>$quizid));
    $PAGE->requires->js_call_amd('quizaccess_quizproctoring/add_camera', 'init',[$cmid, false, true, $attemptid,$interval->time_interval]);
    $PAGE->requires->js_call_amd('quizaccess_quizproctoring/quiz_protection', 'init');
}

function quizaccess_quizproctoring_storeimage($data, $cmid, $attemptid, $quizid, $mainimage, $status=''){
    global $USER, $DB;

    $user = $DB->get_record('user', array('id' => $USER->id), '*', MUST_EXIST);
    //we are all good, store the image
    if ( $mainimage ) {
        if ($qpd = $DB->get_record('quizaccess_proctoring_data', array('userid' => $user->id, 'quizid' => $quizid, 'attemptid' => $attemptid, 'image_status' => 'M' ))) {
            $DB->delete_records('quizaccess_proctoring_data', array('id' => $qpd->id));
        }
        if ($qpd = $DB->get_record('quizaccess_proctoring_data', array('userid' => $user->id, 'quizid' => $quizid, 'attemptid' => $attemptid, 'image_status' => 'I' ))) {
            $DB->delete_records('quizaccess_proctoring_data', array('id' => $qpd->id));
        }
    }

    $record = new stdClass();
    $record->userid = $user->id;
    $record->quizid = $quizid;
    $record->image_status = $mainimage ? 'I' : 'A';
    $record->aws_response = 'aws';
    $record->timecreated = time();
    $record->timemodified = time();
    $record->userimg = $data;
    $record->attemptid  = $attemptid;
    $record->status  = $status;
    $id = $DB->insert_record('quizaccess_proctoring_data', $record);

    $tmpdir = make_temp_directory('quizaccess_quizproctoring/captured/');
    file_put_contents($tmpdir . 'myimage.png', $data);
    $fs = get_file_storage();
    // Prepare file record object
    $context = context_module::instance($cmid);
    $fileinfo = array(
        'contextid' => $context->id,
        'component' => 'quizaccess_quizproctoring',
        'filearea'  => 'cameraimages',   
        'itemid'    => $id,
        'filepath'  => '/',
        'filename'  => $attemptid . "_" . $USER->id . '_myimage.png');
    $file = $fs->get_file($fileinfo['contextid'], $fileinfo['component'], $fileinfo['filearea'], 
            $fileinfo['itemid'], $fileinfo['filepath'], $fileinfo['filename']);
    if ($file) {
        $file->delete();
    }
    $fs->create_file_from_pathname($fileinfo, $tmpdir . 'myimage.png');
    @unlink($tmpdir . 'myimage.png');

    if ( !$mainimage ) {
        $quizaccess_proctoring = $DB->get_record('quizaccess_proctoring',array('quizid' => $quizid));

        $error_string = '';
        if (isset($quizaccess_proctoring->warning_threshold) && $quizaccess_proctoring->warning_threshold != 0) {
            $errors = array(QUIZACCESS_PROCTORING_NOFACEDETECTED, QUIZACCESS_PROCTORING_MULTIFACESDETECTED, QUIZACCESS_PROCTORING_FACESNOTMATCHED, QUIZACCESS_PROCTORING_FACEMASKDETECTED);
            list($inSql, $inParams) = $DB->get_in_or_equal($errors);
            $error_records = $DB->get_records_sql("SELECT * from {quizaccess_proctoring_data} where userid = $user->id AND quizid = $quizid AND attemptid = $attemptid AND image_status = 'A' AND status $inSql", $inParams);

            if (count($error_records) >= $quizaccess_proctoring->warning_threshold) {
                // Submit quiz
                $attemptobj = quiz_attempt::create($attemptid);
                $attemptobj->process_finish(time(), false);
                echo json_encode(array('status' => 'true', 'redirect' => 'true', 'url' => $attemptobj->review_url()->out()));
                die();
            }

            if ($status) {
                $left = $quizaccess_proctoring->warning_threshold - count($error_records);
                if ($left == 1) {
                    $left = $left . ' warning';
                } else {
                    $left = $left . ' warnings';
                }
                $error_string = get_string('warningsleft', 'quizaccess_quizproctoring', $left);
            }
        }

        if ($status && $status != QUIZACCESS_PROCTORING_EYESNOTOPENED) {
            print_error($status, 'quizaccess_quizproctoring', '', $error_string);
            die();
        }
    }
}