<?php 

define('AJAX_SCRIPT', true);
require_once(__DIR__ . '/../../../../config.php');
require_once($CFG->libdir . '/completionlib.php');
require_once($CFG->dirroot . '/mod/quiz/locallib.php');
$userid = required_param('userid', PARAM_INT);
$attemptid = required_param('attemptid', PARAM_INT);
$quizid = required_param('quizid', PARAM_INT);
$changestatus = optional_param('changestatus', false, PARAM_BOOL);
$status = optional_param('status', '', PARAM_TEXT);
$currentpage = optional_param('currentpage', 0 ,PARAM_INT);

    $sql = "select * from {quizaccess_proctor_data} where  (status != '' OR image_status = 'M') AND userid = ".$userid." AND quizid =". $quizid. " AND attemptid =". $attemptid." AND deleted = 0 " ;
    $getImages = $DB->get_records_sql($sql, null, '' , 20);
    $imgarray= array();
    $sqlcount = "select * from {quizaccess_proctor_data} where (status != '' OR image_status = 'M') AND userid = ".$userid." AND quizid =". $quizid. " AND attemptid =". $attemptid." AND deleted = 0 " ;
    $countrecord  = $DB->get_records_sql($sqlcount, null);

    if ($countrecord) {
        $countrecord = ceil(count($countrecord) / 20);
    }
    foreach($getImages as $img) {
        if (strlen($img->userimg) < 40) {
            $quizobj = \quiz::create($img->quizid, $img->userid);
            $context = $quizobj->get_context();
            $fs = get_file_storage();
            $f1 = $fs->get_file($context->id, 'quizaccess_quizproctoring', 'cameraimages', $img->id, '/', $img->userimg);
            $target = $f1->get_content();
        } else {
            $target = $img->userimg;
        }
        array_push($imgarray, array('title' => $img->image_status == 'M' ? get_string('mainimage', 'quizaccess_quizproctoring') : get_string($img->status, 'quizaccess_quizproctoring', '') , 'img' => $target, 'totalpage' => $countrecord));
    }
echo json_encode($imgarray);
