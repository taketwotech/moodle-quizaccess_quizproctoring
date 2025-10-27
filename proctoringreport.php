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
$all = optional_param('all', false, PARAM_BOOL);

$context = context_module::instance($cmid, MUST_EXIST);
if (class_exists('\mod_quiz\quiz_settings')) {
    if ($quizid) {
        $quizobj = \mod_quiz\quiz_settings::create($quizid, $USER->id);
    } else {
        $quizobj = \mod_quiz\quiz_settings::create_for_cmid($cmid, $USER->id);
    }
    $quiz = $quizobj->get_quiz();
    $cm = $quizobj->get_cm();
    $course = $quizobj->get_course();
} else {
    $cm = get_coursemodule_from_id('quiz', $cmid, 0, false, MUST_EXIST);
    $course = $DB->get_record('course', ['id' => $cm->course], '*', MUST_EXIST);
    $quiz = $DB->get_record('quiz', ['id' => $cm->instance], '*', MUST_EXIST);
}

require_login($course, true, $cm);
require_capability('quizaccess/quizproctoring:quizproctoringoverallreport', $context);

$PAGE->set_url(new moodle_url('/mod/quiz/accessrule/quizproctoring/proctoringreport.php',
        ['cmid' => $cmid, 'quizid' => $quizid]));
$PAGE->set_title(get_string('proctoringreport', 'quizaccess_quizproctoring'));
$PAGE->set_pagelayout('report');
$PAGE->activityheader->disable();
$PAGE->navbar->add(get_string('quizaccess_quizproctoring', 'quizaccess_quizproctoring'),
    '/mod/quiz/accessrule/quizproctoring/proctoringreport.php');
$PAGE->requires->js(new moodle_url('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'), true);
$PAGE->requires->js(new moodle_url('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'), true);
$PAGE->requires->css(new moodle_url('https://cdn.datatables.net/1.13.4/css/jquery.dataTables.min.css'));
$PAGE->requires->js(new moodle_url('https://code.jquery.com/jquery-3.7.0.min.js'), true);
$PAGE->requires->js(new moodle_url('https://cdn.datatables.net/1.13.4/js/jquery.dataTables.min.js'), true);
$PAGE->requires->js_init_code("
    $(document).ready(function() {
        const table = $('#proctoringreporttable').DataTable({
            serverSide: true,
            processing: true,
            ajax: {
                url: M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/proctoringreport_ajax.php',
                type: 'POST',
                data: function(d) {
                    d.cmid = {$cmid};
                    d.quizid = {$quizid};
                    d.courseid = {$course->id};
                }
            },
            columns: [
                { data: 'fullname', orderable: true },
                { data: 'email', orderable: true },
                { data: 'lastattempt', orderable: true },
                { data: 'totalimages', orderable: true },
                { data: 'warnings', orderable: true },
                { data: 'review', orderable: false },
                { data: 'actions', orderable: false }
            ],
            order: [[0, 'asc']],
            responsive: true
        });
    });

    $('#exportpdf').on('click', function() {
        const button = $(this);
        button.prop('disabled', true).text('" . get_string('exportpdf_generating', 'quizaccess_quizproctoring') . "');
        $.ajax({
            url: '" . (new moodle_url('/mod/quiz/accessrule/quizproctoring/ajaxexport.php')) . "',
            method: 'GET',
            data: {
                cmid: {$cmid},
                quizid: {$quizid},
                course: " . json_encode($course->shortname) . ",
                quizname: " . json_encode($quiz->name) . ",
                quizopen: {$quiz->timeopen},
            },
            success: function(response) {
                try {
                    const data = JSON.parse(response);
                    if (data.url) {
                        window.location.href = data.url;
                    } else {
                        alert('Error generating report.');
                    }
                } catch (e) {
                    alert('Unexpected response');
                }
            },
            error: function() {
                alert('AJAX error');
            },
            complete: function() {
                button.prop('disabled', false).text('" . get_string('exportpdf', 'quizaccess_quizproctoring') . "');
            }
        });
    });

    $('#exportcsv').on('click', function() {
        const button = $(this);
        button.prop('disabled', true).text('" . get_string('exportcsv_generating', 'quizaccess_quizproctoring') . "');
        $.ajax({
            url: '" . (new moodle_url('/mod/quiz/accessrule/quizproctoring/csvreport.php')) . "',
            method: 'GET',
            data: {
                cmid: {$cmid},
                quizid: {$quizid},
                course: " . json_encode($course->shortname) . ",
            },
            success: function(response) {
                try {
                    const data = typeof response === 'string' ? JSON.parse(response) : response;
                    if (data.url) {
                        window.location.href = data.url;
                    } else {
                        alert('Error generating report.');
                    }
                } catch (e) {
                    console.error(e);
                    alert('Unexpected response');
                }
            },
            error: function() {
                alert('AJAX error');
            },
            complete: function() {
                button.prop('disabled', false).text('" . get_string('exportcsv', 'quizaccess_quizproctoring') . "');
            }
        });
    });

");
$PAGE->requires->js_call_amd('quizaccess_quizproctoring/report', 'init');

if ($deleteuserid) {
    $tmpdir = $CFG->dataroot . '/proctorlink';
    $sqlm = "SELECT * from {quizaccess_main_proctor} where userid =
    ".$deleteuserid." AND quizid = ".$quizid."
    AND deleted = 0";
    $usersmrecords = $DB->get_records_sql($sqlm);
    if ($all) {
        foreach ($usersmrecords as $usersmrecord) {
            $tempfilepath = $tmpdir . '/' . $usersmrecord->userimg;
            if (file_exists($tempfilepath) && is_file($tempfilepath)) {
                unlink($tempfilepath);
            }
        }
        $DB->set_field('quizaccess_main_proctor', 'deleted', 1, ['userid' => $deleteuserid, 'quizid' => $quizid]);
    }

    $sql = "SELECT * from {quizaccess_proctor_data} where userid =
    ".$deleteuserid." AND quizid = ".$quizid."
    AND deleted = 0";
    $usersrecords = $DB->get_records_sql($sql);
    if ($all) {
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
            $file = $fs->get_file($fileinfo['contextid'], $fileinfo['component'], $fileinfo['filearea'],
                $fileinfo['itemid'], $fileinfo['filepath'], $fileinfo['filename']);
            if ($file) {
                $file->delete();
            }

            $tmpdir = $CFG->dataroot . '/proctorlink/';
            $tempfilepath = $tmpdir . $usersrecord->userimg;
            if (file_exists($tempfilepath) && is_file($tempfilepath)) {
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

$headers = [
    get_string("fullname", "quizaccess_quizproctoring"),
    get_string("email", "quizaccess_quizproctoring"),
    get_string("attemptslast", "quizaccess_quizproctoring"),
    get_string("usersimages", "quizaccess_quizproctoring") .
        $OUTPUT->render(new help_icon('usersimages', 'quizaccess_quizproctoring')),
    get_string("usersimageswarning", "quizaccess_quizproctoring") .
        $OUTPUT->render(new help_icon('usersimageswarning', 'quizaccess_quizproctoring')),
    get_string("actions", "quizaccess_quizproctoring") .
        $OUTPUT->render(new help_icon('actions', 'quizaccess_quizproctoring')),
];
$proctoringimageshow = 1;
if ($proctoringimageshow == 1) {
    array_splice($headers, -1, 0, get_string("reviewattempts", "quizaccess_quizproctoring") .
        $OUTPUT->render(new help_icon('reviewattempts', 'quizaccess_quizproctoring')));
}

$output = $PAGE->get_renderer('mod_quiz');
echo $output->header();

if (has_capability('quizaccess/quizproctoring:quizproctoringreport', $context)) {
    $url = $CFG->wwwroot . '/mod/quiz/accessrule/quizproctoring/imagesreport.php?cmid=' . $cmid;
    $btn = '<a class="btn btn-primary" href="' . $url . '">' .
        get_string("proctoringimagereport", "quizaccess_quizproctoring", $course->fullname) . '</a>';
}
echo '<div class="headtitle">' .
     '<p>' . get_string("delinformationu", "quizaccess_quizproctoring") . '</p>' .
     '<div>' . $btn . '</div>' .
     '</div><br/>';

echo '<button id="exportpdf" class="btn btn-secondary">'.get_string('exportpdf', 'quizaccess_quizproctoring').'</button>';
echo '<button id="exportcsv" class="btn btn-secondary">'.get_string('exportcsv', 'quizaccess_quizproctoring').'</button>';

echo '<table id="proctoringreporttable" class="generaltable display" style="width:100%">
        <thead>
            <tr>';
foreach ($headers as $headcol) {
    echo '<th>' . $headcol . '</th>';
}
echo '</tr> </thead>       <tbody></tbody>    </table>';
echo $OUTPUT->footer();
