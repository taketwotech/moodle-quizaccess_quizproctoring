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
$deleteaudioquiz = optional_param('deleteaudioquiz', '', PARAM_INT);
$deleteaudiocourse = optional_param('deleteaudiocourse', '', PARAM_INT);
$all = optional_param('all', false, PARAM_BOOL);

// Check login and get context.
$context = context_module::instance($cmid, MUST_EXIST);
$courseandcm = get_course_and_cm_from_cmid($cmid, 'quiz');
$course = $courseandcm[0];
$cm = $courseandcm[1];
require_login($course, true);
require_capability('quizaccess/quizproctoring:quizproctoringoverallreport', $context);

$PAGE->set_url(new moodle_url(
    '/mod/quiz/accessrule/quizproctoring/imagesreport.php',
    ['cmid' => $cmid]
));
$PAGE->set_title(get_string('proctoringreport', 'quizaccess_quizproctoring'));
$PAGE->set_pagelayout('report');
$PAGE->activityheader->disable();
$PAGE->requires->css(new moodle_url('https://cdn.datatables.net/1.13.4/css/jquery.dataTables.min.css'));
$PAGE->requires->js(new moodle_url('https://code.jquery.com/jquery-3.7.0.min.js'), true);
$PAGE->requires->js(new moodle_url('https://cdn.datatables.net/1.13.4/js/jquery.dataTables.min.js'), true);
$PAGE->requires->js_init_code("
    $(document).ready(function() {
        $('#imagesreporttable').DataTable({
            pageLength: 10,
            lengthMenu: [ [10, 25, 50, -1], [10, 25, 50, 'All'] ],
            language: {
                search: 'Search:',
                lengthMenu: 'Show _MENU_ per page',
                info: 'Showing _START_ to _END_ of _TOTAL_ entries',
                infoEmpty: 'No records available',
                emptyTable: 'No records found',
                paginate: {
                    first: 'First',
                    last: 'Last',
                    next: 'Next',
                    previous: 'Previous'
                },
                zeroRecords: 'No matching records found',
                infoFiltered: '(filtered from _MAX_ total records)'
            }
        });
    });
");
$PAGE->requires->js_call_amd('quizaccess_quizproctoring/report', 'init');
$mainrecords = [];
if ($deletequizid || $delcourse) {
    if ($deletequizid) {
        $sql = "SELECT * FROM {quizaccess_main_proctor} WHERE quizid = :quizid AND deleted = 0";
        $params = ['quizid' => $deletequizid];
        $usersrecords = $DB->get_records_sql($sql, $params);
        $deletequiz = $deletequizid;
    } else if ($delcourse) {
        $sql = "SELECT q.id AS quizid
            FROM {quiz} q
            JOIN {course_modules} cm ON cm.instance = q.id
            WHERE cm.course = :courseid
            AND cm.module = (
                SELECT id FROM {modules} WHERE name = 'quiz'
            )";
        $params = ['courseid' => $delcourse];
        $quizrecords = $DB->get_records_sql($sql, $params);
        $quizids = array_map(function ($record) {
            return $record->quizid;
        }, $quizrecords);
        if (!empty($quizids)) {
            [$insql, $inparams] = $DB->get_in_or_equal($quizids, SQL_PARAMS_NAMED);
            $sql = "SELECT * FROM {quizaccess_proctor_data} WHERE quizid $insql AND deleted = 0";
            $usersrecords = $DB->get_records_sql($sql, $inparams);

            $sqlm = "SELECT * FROM {quizaccess_main_proctor} WHERE quizid $insql AND deleted = 0";
            $mainrecords = $DB->get_records_sql($sqlm, $inparams);

            $deletequiz = $quizids;
        } else {
            $usersrecords = [];
            $mainrecords = [];
            $deletequiz = [];
        }
    }
    if ($all) {
        $tmpdir = $CFG->dataroot . '/proctorlink/';
        foreach ($usersrecords as $usersrecord) {
            if (class_exists('\mod_quiz\quiz_settings')) {
                $quizobj = \mod_quiz\quiz_settings::create($usersrecord->quizid, $usersrecord->userid);
            } else {
                $quizobj = \quiz::create($usersrecord->quizid, $usersrecord->userid);
            }
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

            // Delete file from the temp directory.
            $tempfilepath = $tmpdir . $usersrecord->userimg;
            if (file_exists($tempfilepath) && is_file($tempfilepath)) {
                unlink($tempfilepath);
            }
        }
        foreach ($mainrecords as $mainrecord) {
            $tempfilepath = $tmpdir . '/' . $mainrecord->userimg;
            if (file_exists($tempfilepath) && is_file($tempfilepath)) {
                unlink($tempfilepath);
            }
        }
        if (!empty($deletequiz)) {
            if (is_array($deletequiz)) {
                [$insql, $inparams] = $DB->get_in_or_equal($deletequiz, SQL_PARAMS_NAMED);
                $sql = "UPDATE {quizaccess_proctor_data}
                        SET deleted = 1 WHERE quizid $insql";
                $DB->execute($sql, $inparams);
                $sql = "UPDATE {quizaccess_main_proctor}
                        SET deleted = 1 WHERE quizid $insql";
                $DB->execute($sql, $inparams);
            } else {
                $sql = "UPDATE {quizaccess_proctor_data}
                        SET deleted = 1 WHERE quizid = :quizid";
                $DB->execute($sql, ['quizid' => $deletequiz]);
                $sql = "UPDATE {quizaccess_main_proctor}
                        SET deleted = 1 WHERE quizid = :quizid";
                $DB->execute($sql, ['quizid' => $deletequiz]);
            }
        }
        $notification = new \core\output\notification(
            get_string('imagesdeleted', 'quizaccess_quizproctoring'),
            \core\output\notification::NOTIFY_SUCCESS
        );
        echo $OUTPUT->render($notification);
        $redirecturl = new moodle_url(
            '/mod/quiz/accessrule/quizproctoring/imagesreport.php',
            ['cmid' => $cmid]
        );
        redirect($redirecturl, get_string('imagesdeleted', 'quizaccess_quizproctoring'), 3);
    }
}

if ($deleteaudioquiz || $deleteaudiocourse) {
    if ($deleteaudioquiz) {
        $sql = "SELECT * FROM {quizaccess_proctor_audio} WHERE quizid = :quizid AND deleted = 0";
        $params = ['quizid' => $deleteaudioquiz];
        $audiorecords = $DB->get_records_sql($sql, $params);
        $deletequiz = $deleteaudioquiz;
    } else if ($deleteaudiocourse) {
        $sql = "SELECT q.id AS quizid
            FROM {quiz} q
            JOIN {course_modules} cm ON cm.instance = q.id
            WHERE cm.course = :courseid
            AND cm.module = (
                SELECT id FROM {modules} WHERE name = 'quiz'
            )";
        $params = ['courseid' => $deleteaudiocourse];
        $quizrecords = $DB->get_records_sql($sql, $params);
        $quizids = array_map(function ($record) {
            return $record->quizid;
        }, $quizrecords);
        if (!empty($quizids)) {
            [$insql, $inparams] = $DB->get_in_or_equal($quizids, SQL_PARAMS_NAMED);
            $sql = "SELECT * FROM {quizaccess_proctor_audio} WHERE quizid $insql AND deleted = 0";
            $audiorecords = $DB->get_records_sql($sql, $inparams);
            $deletequiz = $quizids;
        } else {
            $audiorecords = [];
            $deletequiz = [];
        }
    }
    $dest = $CFG->dataroot . '/quizproctoring/audio/';
    if ($all) {
        foreach ($audiorecords as $audiorecord) {
            $tempfilepath = $dest . '/' . $audiorecord->audioname;
            if (file_exists($tempfilepath) && is_file($tempfilepath)) {
                unlink($tempfilepath);
            }
        }
        if (!empty($deletequiz)) {
            if (is_array($deletequiz)) {
                [$insql, $inparams] = $DB->get_in_or_equal($deletequiz, SQL_PARAMS_NAMED);
                $sql = "UPDATE {quizaccess_proctor_audio}
                        SET deleted = 1 WHERE quizid $insql";
                $DB->execute($sql, $inparams);
            } else {
                $sql = "UPDATE {quizaccess_proctor_audio} SET deleted = 1 WHERE quizid = :quizid";
                $DB->execute($sql, ['quizid' => $deletequiz]);
            }
        }
        $notification = new \core\output\notification(
            get_string('audiosdeleted', 'quizaccess_quizproctoring'),
            \core\output\notification::NOTIFY_SUCCESS
        );
        echo $OUTPUT->render($notification);
        $redirecturl = new moodle_url(
            '/mod/quiz/accessrule/quizproctoring/imagesreport.php',
            ['cmid' => $cmid]
        );
        redirect($redirecturl, get_string('audiosdeleted', 'quizaccess_quizproctoring'), 3);
    }
}

$table = new html_table();
$table->id = 'imagesreporttable';
$headers = [
    get_string("fullquizname", "quizaccess_quizproctoring"),
    get_string("users", "quizaccess_quizproctoring"),
    get_string("usersimages", "quizaccess_quizproctoring"),
    get_string("actions", "quizaccess_quizproctoring"),
    get_string("actionas", "quizaccess_quizproctoring"),
];
$table->head = $headers;
echo $OUTPUT->header();
if (has_capability('quizaccess/quizproctoring:quizproctoringreport', $context)) {
    $btn = '<a class="btn btn-primary delcourse" href="#"
    data-cmid="' . $cmid . '" data-courseid="' . $course->id . '"
    data-course="' . $course->fullname . '">
    ' . get_string("delcoursemages", "quizaccess_quizproctoring", $course->fullname) . '</a>';
    $btnaudio = '<a class="btn btn-primary delcourseaudio" href="#"
    data-cmid="' . $cmid . '" data-courseid="' . $course->id . '"
    data-course="' . $course->fullname . '">
    ' . get_string("delcourseaudios", "quizaccess_quizproctoring", $course->fullname) . '</a>';
}

$sqlcount = "SELECT COUNT(DISTINCT p.quizid) AS totalcount
             FROM {quizaccess_main_proctor} p
             JOIN {quiz} q ON p.quizid = q.id
             WHERE p.userimg IS NOT NULL AND p.deleted=0
             AND p.userimg !='' AND q.course = :courseid";
$totalcount = $DB->count_records_sql($sqlcount, ['courseid' => $course->id]);
if ($totalcount > 0) {
    echo '<div class="headtitle">' .
     '<p>' . get_string("delinformation", "quizaccess_quizproctoring", $course->fullname) . '</p>' .
     '<div>' . $btn . ' ' . (isset($btnaudio) ? $btnaudio : '') . '</div>' .
     '</div><br/>';
}
$sql = "SELECT
    q.id AS quizid,
    q.name AS quizname,
    (
        SELECT COUNT(mp.userimg)
        FROM {quizaccess_main_proctor} mp
        WHERE mp.quizid = q.id
          AND mp.deleted = 0
          AND mp.userimg IS NOT NULL
          AND mp.userimg != ''
    ) AS main_proctor_images,
    (
        SELECT COUNT(pd.userimg)
        FROM {quizaccess_proctor_data} pd
        WHERE pd.quizid = q.id
          AND pd.deleted = 0
          AND pd.userimg IS NOT NULL
          AND pd.userimg != ''
          AND pd.image_status != 'M'
    ) AS proctor_data_images,
    (
        (
            SELECT COUNT(mp.userimg)
            FROM {quizaccess_main_proctor} mp
            WHERE mp.quizid = q.id
              AND mp.deleted = 0
              AND mp.userimg IS NOT NULL
              AND mp.userimg != ''
        ) +
        (
            SELECT COUNT(pd.userimg)
            FROM {quizaccess_proctor_data} pd
            WHERE pd.quizid = q.id
              AND pd.deleted = 0
              AND pd.userimg IS NOT NULL
              AND pd.userimg != ''
              AND pd.image_status != 'M'
        )
    ) AS total_images,
    (
        SELECT COUNT(DISTINCT userid)
        FROM {quizaccess_main_proctor}
            WHERE quizid = q.id AND deleted = 0
    ) AS total_users,
    (
        SELECT COUNT(*)
        FROM {quizaccess_proctor_audio}
        WHERE quizid = q.id AND deleted = 0
    ) AS total_audios
FROM {quiz} q
WHERE q.course = :courseid
ORDER BY q.name ASC";
$records = $DB->get_records_sql($sql, ['courseid' => $course->id]);
if (empty($records)) {
    $table->data[] = [
        get_string('norecordsfound', 'quizaccess_quizproctoring'),
        '',
        '',
        '',
        '',
    ];
} else {
    foreach ($records as $record) {
        if ($record->total_images == 0) {
            $deleteicon = '<span title="' . get_string('delete') . '" class="delete-quizs disabled"
            style="opacity: 0.5; cursor: not-allowed;">
                <i class="icon fa fa-trash"></i>
            </span>';
        } else {
            $deleteicon = '<a href="#" title="' . get_string('delete') . '"
                class="delete-quiz" data-cmid="' . $cmid . '" data-quizid="' . $record->quizid . '"
                data-quiz="' . $record->quizname . '">
                <i class="icon fa fa-trash"></i></a>';
        }
        if ($record->total_audios == 0) {
            $deleteaudioicon = '<span title="' . get_string('delete') . '" class="delete-audio-quizs disabled"
            style="opacity: 0.5; cursor: not-allowed;">
                <i class="icon fa fa-trash"></i>
            </span>';
        } else {
            $deleteaudioicon = '<a href="#" title="' . get_string('delete') . '"
                class="delete-audio-quiz" data-cmid="' . $cmid . '" data-quizid="' . $record->quizid . '"
                data-quiz="' . $record->quizname . '">
                <i class="icon fa fa-trash"></i></a>';
        }
        // Get the correct cmid for this specific quiz.
        $quizcm = get_coursemodule_from_instance('quiz', $record->quizid, $course->id);
        $backurl = new moodle_url('/mod/quiz/accessrule/quizproctoring/proctoringreport.php', [
            'cmid' => $quizcm->id,
            'quizid' => $record->quizid,
        ]);
        $helptext = get_string('hoverhelptext', 'quizaccess_quizproctoring', $record->quizname);
        $quizname = '<a href="' . $backurl . '" title="' . $helptext . '">' . $record->quizname . '</a>';
        $table->data[] = [$quizname, $record->total_users, $record->total_images, $deleteicon, $deleteaudioicon];
    }
}

echo html_writer::table($table);
echo $OUTPUT->footer();
