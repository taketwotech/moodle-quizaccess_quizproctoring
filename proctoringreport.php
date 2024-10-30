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
use mod_quiz\quiz_settings;

require_once(__DIR__ . '/../../../../config.php');
require_once($CFG->dirroot . '/mod/quiz/locallib.php');

$cmid = required_param('cmid', PARAM_INT);
$quizid = optional_param('quizid', '', PARAM_INT);
$deleteuserid = optional_param('delete', '', PARAM_INT);
$all = optional_param('all', false, PARAM_BOOL);
$perpage = 10;
$page = optional_param('page', 0, PARAM_INT);

// Check login and get context.
$context = context_module::instance($cmid, MUST_EXIST);
if ($id) {
    $quizobj = quiz_settings::create_for_cmid($cmid, $USER->id);
} else {
    $quizobj = quiz_settings::create($quizid, $USER->id);
}
$quiz = $quizobj->get_quiz();
$cm = $quizobj->get_cm();
$course = $quizobj->get_course();
quiz_view($quiz, $course, $cm, $context);
require_login($course, true, $cm);
require_capability('quizaccess/quizproctoring:quizproctoringoverallreport', $context);

$PAGE->set_url(new moodle_url('/mod/quiz/accessrule/quizproctoring/proctoringreport.php',
        ['cmid' => $cmid, 'quizid' => $quizid]));
$PAGE->set_title(get_string('proctoringreport', 'quizaccess_quizproctoring'));
$PAGE->set_pagelayout('course');
$PAGE->navbar->add(get_string('quizaccess_quizproctoring', 'quizaccess_quizproctoring'),
    '/mod/quiz/accessrule/quizproctoring/proctoringreport.php');
$PAGE->requires->js_call_amd('quizaccess_quizproctoring/report', 'init');

if ($deleteuserid) {
    $sql = "SELECT * from {quizaccess_proctor_data} where userid =
    ".$deleteuserid." AND quizid = ".$quizid."
    AND deleted = 0";
    $usersrecords = $DB->get_records_sql($sql);
    if ($all) {
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

            $tmpdir = make_temp_directory('quizaccess_quizproctoring/captured/');
            $tempfilepath = $tmpdir . $usersrecord->userimg;
            if (file_exists($tempfilepath)) {
                unlink($tempfilepath);
            }
        }
        $DB->set_field('quizaccess_proctor_data', 'deleted', 1, ['userid' => $deleteuserid, 'quizid' => $quizid]);
        $notification = new \core\output\notification(get_string('imagesdeleted', 'quizaccess_quizproctoring'),
            \core\output\notification::NOTIFY_SUCCESS);
        echo $OUTPUT->render($notification);
        $redirecturl = new moodle_url('/mod/quiz/accessrule/quizproctoring/proctoringreport.php',
            ['cmid' => $cmid, 'quizid' => $quizid]);
        redirect($redirecturl, get_string('imagesdeleted', 'quizaccess_quizproctoring'), 3);
    }
}
$table = new html_table();
$headers = [
    get_string("fullname", "quizaccess_quizproctoring"),
    get_string("email", "quizaccess_quizproctoring"),
    get_string("usersimages", "quizaccess_quizproctoring"),
    get_string("actions", "quizaccess_quizproctoring"),
];
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
    '.get_string("proctoringimagereport", "quizaccess_quizproctoring", $course->fullname).'</a>';
}
echo '<div class="headtitle">' .
     '<p>' . get_string("delinformationu", "quizaccess_quizproctoring") . '</p>' .
     '<div>' . $btn . '</div>' .
     '</div><br/>';

$sqlcount = "SELECT COUNT(DISTINCT p.userid) AS totalcount
             FROM {quizaccess_proctor_data} p
             JOIN {user} u ON u.id = p.userid
             WHERE p.userimg IS NOT NULL AND p.deleted = 0 AND p.userimg != ''
             AND p.quizid = :quizid";
$totalcount = $DB->count_records_sql($sqlcount, ['quizid' => $quizid]);

$sql = "SELECT u.id, u.firstname, u.lastname, u.email, COUNT(p.userimg) AS image_count
        FROM {quizaccess_proctor_data} p
        JOIN {user} u ON u.id = p.userid
        WHERE p.userimg IS NOT NULL AND p.deleted = 0 AND p.userimg != ''
        AND p.quizid = :quizid
        GROUP BY p.userid
        ORDER BY u.firstname ASC";
$records = $DB->get_records_sql($sql, ['quizid' => $quizid], $page * $perpage, $perpage);

foreach ($records as $record) {
    $namelink = html_writer::link(
        new moodle_url('/user/view.php', ['id' => $record->id]),
        $record->firstname . ' ' . $record->lastname
    );
    $deleteicon = '<a href="#" title="' . get_string('delete') . '"
    class="delete-icon" data-cmid="' . $cmid . '" data-quizid="' . $quizid . '" data-userid="' . $record->id . '"
    data-username="' . $record->firstname . ' ' . $record->lastname . '">
    <i class="icon fa fa-trash"></i></a>';

    $imgurl = $CFG->wwwroot.'/mod/quiz/accessrule/quizproctoring/reviewattempts.php?userid='.
    $record->id.'&cmid='.$cmid.'&quizid='.$quizid;
    $imageicon = '<a href="'.$imgurl.'"><img class="imageicon" src="' .
    $OUTPUT->image_url('review-icon', 'quizaccess_quizproctoring') . '" alt="icon"></a>';

    $row = [$namelink, $record->email, $record->image_count];
    if ($proctoringimageshow == 1) {
        $row[] = $imageicon;
    }
    $row[] = $deleteicon;
    $table->data[] = $row;
}

echo html_writer::table($table);
echo $OUTPUT->paging_bar($totalcount, $page, $perpage, $PAGE->url);
echo $OUTPUT->footer();
