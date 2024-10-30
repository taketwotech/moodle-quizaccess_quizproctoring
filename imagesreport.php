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
 * Show proctoring Images report
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2024 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

use mod_quiz\output\renderer;
use mod_quiz\output\view_page;
use mod_quiz\quiz_settings;

require_once(__DIR__ . '/../../../../config.php');
require_once($CFG->dirroot . '/mod/quiz/locallib.php');

$cmid = required_param('cmid', PARAM_INT);
$deletequizid = optional_param('delete', '', PARAM_INT);
$delcourse = optional_param('delcourse', '', PARAM_INT);
$all = optional_param('all', false, PARAM_BOOL);
$perpage = 10;
$page = optional_param('page', 0, PARAM_INT);

// Check login and get context.
$context = context_module::instance($cmid, MUST_EXIST);
list($course, $cm) = get_course_and_cm_from_cmid($cmid, 'quiz');
require_login($course, true);
require_capability('quizaccess/quizproctoring:quizproctoringoverallreport', $context);

$PAGE->set_url(new moodle_url('/mod/quiz/accessrule/quizproctoring/imagesreport.php',
        ['cmid' => $cmid]));
$PAGE->set_title(get_string('proctoringreport', 'quizaccess_quizproctoring'));
$PAGE->set_pagelayout('course');
$PAGE->requires->js_call_amd('quizaccess_quizproctoring/report', 'init');

if ($deletequizid || $delcourse) {
    if ($deletequizid) {
        $sql = "SELECT * from {quizaccess_proctor_data} where quizid =
        ".$deletequizid." AND deleted = 0";
        $usersrecords = $DB->get_records_sql($sql);
        $deletequiz = $deletequizid;
    } else if ($delcourse) {
        $sql = "SELECT q.id AS quizid
            FROM {quiz} q
            JOIN {course_modules} cm ON cm.instance = q.id
            WHERE cm.course = $delcourse
            AND cm.module = (
            SELECT id FROM {modules} WHERE name = 'quiz'
            )";
        $quizrecords = $DB->get_records_sql($sql);
        $quizids = array_map(function($record) {
            return $record->quizid;
        }, $quizrecords);
        $quizidsstring = implode(',', array_map('intval', $quizids));
        $sql = "SELECT * from {quizaccess_proctor_data} where quizid
          IN ($quizidsstring) AND deleted = 0";
        $usersrecords = $DB->get_records_sql($sql);
        $deletequiz = $quizidsstring;
    }
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

            // Delete file from the temp directory.
            $tmpdir = make_temp_directory('quizaccess_quizproctoring/captured/');
            $tempfilepath = $tmpdir . $usersrecord->userimg;
            if (file_exists($tempfilepath)) {
                unlink($tempfilepath);
            }
        }
        if (!empty($deletequiz)) {
            $DB->execute("
                UPDATE {quizaccess_proctor_data}
                SET deleted = 1
                WHERE quizid IN ($deletequiz)
            ");
        }
        $notification = new \core\output\notification(get_string('imagesdeleted',
            'quizaccess_quizproctoring'), \core\output\notification::NOTIFY_SUCCESS);
        echo $OUTPUT->render($notification);
        $redirecturl = new moodle_url('/mod/quiz/accessrule/quizproctoring/imagesreport.php', ['cmid' => $cmid]);
        redirect($redirecturl, get_string('imagesdeleted', 'quizaccess_quizproctoring'), 3);
    }
}

$table = new html_table();
$headers = [
    get_string("fullquizname", "quizaccess_quizproctoring"),
    get_string("users", "quizaccess_quizproctoring"),
    get_string("usersimages", "quizaccess_quizproctoring"),
    get_string("actions", "quizaccess_quizproctoring"),
];
$table->head = $headers;
echo $OUTPUT->header();
if (has_capability('quizaccess/quizproctoring:quizproctoringreport', $context)) {
    $btn = '<a class="btn btn-primary delcourse" href="#"
    data-cmid="' . $cmid . '" data-courseid="' . $course->id . '"
    data-course="' . $course->fullname . '">
    '.get_string("delcoursemages", "quizaccess_quizproctoring", $course->fullname).'</a>';
}

$sqlcount = "SELECT COUNT(DISTINCT p.quizid) AS totalcount
             FROM {quizaccess_proctor_data} p
             JOIN {quiz} q ON p.quizid = q.id
             WHERE p.userimg IS NOT NULL AND p.deleted=0
             AND p.userimg !='' AND q.course = :courseid";
$totalcount = $DB->count_records_sql($sqlcount, ['courseid' => $course->id]);
if ($totalcount > 0) {
    echo '<div class="headtitle">' .
     '<p>' . get_string("delinformation", "quizaccess_quizproctoring", $course->fullname) . '</p>' .
     '<div>' . $btn . '</div>' .
     '</div><br/>';
}
$sql = "SELECT q.name AS quiz_name, p.quizid, COUNT(DISTINCT p.userid) AS user_count,
        COUNT(p.userimg) AS image_count
        FROM {quizaccess_proctor_data} p
        JOIN {quiz} q ON p.quizid = q.id
        WHERE p.userimg IS NOT NULL AND p.deleted=0
        AND p.userimg !=''
        AND q.course = :courseid
        GROUP BY p.quizid, q.name
        ORDER BY q.name ASC";
$records = $DB->get_records_sql($sql, ['courseid' => $course->id], $page * $perpage, $perpage);
foreach ($records as $record) {
    $quizobj = quiz_settings::create($record->quizid, $USER->id);
    $quiz = $quizobj->get_quiz();
    $cm = $quizobj->get_cm();
    $deleteicon = '<a href="#" title="' . get_string('delete') . '"
    class="delete-quiz" data-cmid="' . $cmid . '" data-quizid="' . $record->quizid . '"
    data-quiz="' . $record->quiz_name . '">
    <i class="icon fa fa-trash"></i></a>';
    $backurl = new moodle_url('/mod/quiz/accessrule/quizproctoring/proctoringreport.php', [
    'cmid' => $quiz->cmid,
    'quizid' => $record->quizid,
    ]);
    $helptext = get_string('hoverhelptext', 'quizaccess_quizproctoring', $record->quiz_name);
    $quizname = '<a href="'.$backurl.'" title="'.$helptext.'">'.$record->quiz_name.'</a>';
    $table->data[] = [$quizname, $record->user_count, $record->image_count, $deleteicon];
}

echo html_writer::table($table);
echo $OUTPUT->paging_bar($totalcount, $page, $perpage, $PAGE->url);
echo $OUTPUT->footer();
