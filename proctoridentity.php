<?php 

define('AJAX_SCRIPT', true);
require_once(__DIR__ . '/../../../../config.php');
require_once($CFG->dirroot . '/mod/quiz/locallib.php');

$userid = required_param('userid', PARAM_INT);
$attemptid = required_param('attemptid', PARAM_INT);
$quizid = required_param('quizid', PARAM_INT);

$url = '';
if($proctoringimage = $DB->get_record("quizaccess_proctor_data", array('attemptid' => $attemptid, 'userid'=> $userid, 'quizid' => $quizid, 'image_status' => 'M'))) {
    $quizobj = \quiz::create($quizid, $userid);
    $context = $quizobj->get_context();
    $fs = get_file_storage();
    $files = $fs->get_area_files($context->id, 'quizaccess_quizproctoring', 'identity', $proctoringimage->id);
    foreach ($files as $file) {
        $filename = $file->get_filename();
        $url = moodle_url::make_file_url('/pluginfile.php', '/'.$file->get_contextid().'/quizaccess_quizproctoring/identity/'.$file->get_itemid().'/'.$filename);
    }

    if ($url) {
        $url = new moodle_url($url);
        echo json_encode(array('success' => true, 'url' => $url->out()));
    } else {
        echo json_encode(array('success' => false, 'message' => get_string('noimages', 'quizaccess_quizproctoring')));
    }
} else {
    echo json_encode(array('success' => false, 'message' => get_string('noimages', 'quizaccess_quizproctoring')));
}
