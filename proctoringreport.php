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
 * Show proctoring report
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2024 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../../../config.php');
require_once($CFG->dirroot . '/mod/quiz/locallib.php');

$cmid = required_param('cmid', PARAM_INT);
$quizid = optional_param('quizid', '', PARAM_INT);
$deleteuserid = optional_param('delete', '', PARAM_INT);

// Check login and get context.
$context = context_module::instance($cmid, MUST_EXIST);
list($course, $cm) = get_course_and_cm_from_cmid($cmid, 'quiz');
require_login($course, true, $cm);
require_capability('quizaccess/quizproctoring:quizproctoringstudentreport', $context);

$PAGE->set_url(new moodle_url('/mod/quiz/accessrule/quizproctoring/proctoringreport.php'));
$PAGE->set_title(get_string('proctoringreport', 'quizaccess_quizproctoring'));
$PAGE->set_pagelayout('course');
$PAGE->navbar->add(get_string('quizaccess_quizproctoring', 'quizaccess_quizproctoring'), '/mod/quiz/accessrule/quizproctoring/proctoringreport.php');
$PAGE->requires->js_call_amd('quizaccess_quizproctoring/report', 'init');

if ($deleteuserid) {
  $sql = "SELECT * from {quizaccess_proctor_data} where userid =
  ".$deleteuserid." AND quizid = ".$quizid."
  AND deleted = 0";
  $usersrecords = $DB->get_records_sql($sql);
  foreach ($usersrecords as $usersrecord) {
    $quizobj = \quiz::create($usersrecord->quizid, $usersrecord->userid);
    $context = $quizobj->get_context();
    $fs = get_file_storage();
    $fileinfo = [
        'contextid' => $context->id,
        'component' => 'quizaccess_quizproctoring',
        'filearea' => 'cameraimages',
        'itemid' => $usersrecord->id,
        'filepath' => '/',
        'filename' => $usersrecord->userimg,
    ];    
    $file = $fs->get_file($fileinfo['contextid'], $fileinfo['component'], $fileinfo['filearea'],
        $fileinfo['itemid'], $fileinfo['filepath'], $fileinfo['filename']);
    if ($file) {
        $file->delete();
    }

    // Delete file from the temp directory
    $tmpdir = make_temp_directory('quizaccess_quizproctoring/captured/');
    $tempfilepath = $tmpdir . $usersrecord->userimg;    
    if (file_exists($tempfilepath)) {
        unlink($tempfilepath);
    }
  }
  $DB->set_field('quizaccess_proctor_data', 'deleted', 1, ['userid' => $deleteuserid, 'quizid' => $quizid]);
}
$table = new html_table();
$headers = array(
    get_string("fullname", "quizaccess_quizproctoring"),
    get_string("email", "quizaccess_quizproctoring"),
    get_string("usersimages", "quizaccess_quizproctoring"),
    get_string("actions", "quizaccess_quizproctoring")
);
$proctoringimageshow = get_config('quizaccess_quizproctoring', 'proctoring_image_show');
if ($proctoringimageshow == 1) {
    array_splice($headers, -1, 0, get_string("reviewattempts", "quizaccess_quizproctoring"));
}
$table->head = $headers;
$output = $PAGE->get_renderer('mod_quiz');
echo $output->header();

if (has_capability('quizaccess/quizproctoring:quizproctoringreport', $context)) {
    $url = $CFG->wwwroot.'/mod/quiz/accessrule/quizproctoring/imagesreport.php?cmid='.$cmid;
    $btn = '<a class="btn btn-primary" href="'.$url.'">
    '.get_string("proctoringimagereport","quizaccess_quizproctoring",$course->fullname).'</a>';
}
echo '<div class="deltitle">' .
     '<h5>' . get_string("delinformationu", "quizaccess_quizproctoring") . '</h5>' .
     '<div>' . $btn . '</div>' .
     '</div><br/>';

$sql = "SELECT u.id, u.firstname, u.lastname, u.email,
COUNT(p.userimg) AS image_count
FROM {quizaccess_proctor_data} p JOIN {user} u ON u.id = p.userid
WHERE p.userimg IS NOT NULL AND p.deleted=0 AND userimg !=''
AND p.quizid = $quizid GROUP BY p.userid";
$records = $DB->get_records_sql($sql);
foreach($records as $record) {    
    $namelink = html_writer::link(
        new moodle_url('/user/view.php', array('id' => $record->id)),
        $record->firstname . ' ' . $record->lastname
    );    
    $deleteicon = html_writer::link(
        new moodle_url('/mod/quiz/accessrule/quizproctoring/proctoringreport.php', 
        array('cmid' => $cmid,
        'quizid' => $quizid, 'delete' => $record->id)),
        html_writer::tag('i', '', array('class' => 'icon fa fa-trash')),
        array('title' => get_string('delete'), 'class' => 'delete-icon',
        'data-username' => $record->firstname . ' ' . $record->lastname)
    );
    $imgurl = $CFG->wwwroot.'/mod/quiz/accessrule/quizproctoring/reviewattempts.php?userid='.$record->id.'&cmid='.$cmid.'&quizid='.$quizid;
    $imageicon = '<a href="'.$imgurl.'"><img class="imageicon" src="' . $OUTPUT->image_url('review-icon', 'quizaccess_quizproctoring') . '" alt="icon"></a>';

    $row = array($namelink, $record->email, $record->image_count);
    if ($proctoringimageshow == 1) {
        $row[] = $imageicon;
    }
    $row[] = $deleteicon;
    $table->data[] = $row;
}

echo html_writer::table($table);
echo $OUTPUT->footer();