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
 * Show attempts image report
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2024 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../../../config.php');
require_once($CFG->dirroot . '/mod/quiz/locallib.php');

$userid = required_param('userid', PARAM_INT);
$cmid = required_param('cmid', PARAM_INT);
$quizid = required_param('quizid', PARAM_INT);
$perpage = 10;
$page = optional_param('page', 0, PARAM_INT);

$user = $DB->get_record('user', ['id' => $userid], '*', MUST_EXIST);
$context = context_module::instance($cmid, MUST_EXIST);
$coursemodule = get_course_and_cm_from_cmid($cmid, 'quiz');
$course = $coursemodule[0];
$cm = $coursemodule[1];
require_login($course, true, $cm);
require_capability('quizaccess/quizproctoring:quizproctoringoverallreport', $context);
$proctoringimageshow = 1;
if ($proctoringimageshow == 1) {
    $PAGE->set_url(new moodle_url('/mod/quiz/accessrule/quizproctoring/reviewattempts.php', [
        'userid' => $userid, 'cmid' => $cmid, 'quizid' => $quizid,
    ]));
    $PAGE->set_title(get_string('reviewattempts', 'quizaccess_quizproctoring'));

    $PAGE->navbar->add(
        get_string('quizaccess_quizproctoring', 'quizaccess_quizproctoring'),
        '/mod/quiz/accessrule/quizproctoring/reviewattempts.php'
    );
    $storerecord = $DB->get_record('quizaccess_quizproctoring', ['quizid' => $cm->instance]);
    $enableteacherproctor = $storerecord->enableteacherproctor ?? 0;
    $enableteacherproctorjs = $enableteacherproctor;
    $enableeyecheckreal = $storerecord->enableeyecheckreal ?? 0;
    $enableeyecheckrealjs = $enableeyecheckreal;

    $PAGE->requires->js(new moodle_url('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'), true);
    $PAGE->requires->js(new moodle_url('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'), true);
    $PAGE->requires->css(new moodle_url('https://cdn.datatables.net/1.13.4/css/jquery.dataTables.min.css'));
    $PAGE->requires->js(new moodle_url('https://code.jquery.com/jquery-3.7.0.min.js'), true);
    $PAGE->requires->js(new moodle_url('https://cdn.datatables.net/1.13.4/js/jquery.dataTables.min.js'), true);

    $columnsconfig = [
        '{ orderable: true }',
        '{ orderable: true }',
        '{ orderable: true }',
        '{ orderable: true }',
        '{ orderable: true }',
        '{ orderable: false }',
        '{ orderable: false }',
        '{ orderable: true }',
    ];

    if ($enableteacherproctor == 1) {
        $columnsconfig[] = '{ orderable: true }';
    }

    if ($enableeyecheckreal == 1) {
        $columnsconfig[] = '{ orderable: true }';
        $columnsconfig[] = '{ orderable: true }';
    }
    $columnsconfig[] = '{ orderable: false }';

    $columnsjs = '[' . implode(',', $columnsconfig) . ']';

    $PAGE->requires->js_init_code("
        $(document).ready(function() {
            var enableteacherproctor = {$enableteacherproctorjs};
            var enableeyecheckreal = {$enableeyecheckrealjs};
            window.attemptsReportTable = $('#attemptsreporttable').DataTable({
                serverSide: true,
                processing: true,
                ajax: {
                    url: M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/reviewattempts_ajax.php',
                    type: 'POST',
                    data: {
                        userid: {$userid},
                        quizid: {$quizid},
                        cmid: {$cmid},
                        enableteacherproctor: enableteacherproctor,
                        enableeyecheckreal: enableeyecheckreal
                    }
                },
                pageLength: 10,
                lengthMenu: [ [10, 25, 50, -1], [10, 25, 50, 'All'] ],
                columns: {$columnsjs},
                order: [[1, 'desc']],
                language: {
                    search: 'Search:',
                    lengthMenu: 'Show _MENU_ per page',
                    info: 'Showing _START_ to _END_ of _TOTAL_ entries',
                    paginate: {
                        first: 'First',
                        last: 'Last',
                        next: 'Next',
                        previous: 'Previous'
                    },
                    zeroRecords: 'No matching records found',
                    infoEmpty: 'No records available',
                    infoFiltered: '(filtered from _MAX_ total records)'
                }
            });

        });
    ");

    $PAGE->requires->js_call_amd('quizaccess_quizproctoring/report', 'init');
    $PAGE->requires->strings_for_js(['noimageswarning', 'proctoringimages',
        'attemptstarted', 'proctoringidentity', 'allimages', 'eyeofferror'], 'quizaccess_quizproctoring');
    $PAGE->requires->css(new moodle_url($CFG->wwwroot . '/mod/quiz/accessrule/quizproctoring/libraries/css/lightbox.min.css'));
    $PAGE->requires->js(new moodle_url($CFG->wwwroot . '/mod/quiz/accessrule/quizproctoring/libraries/js/lightbox.min.js'), true);

    echo '<input type="hidden" id="storeallimages" name="storeallimages" value="' . $storerecord->storeallimages . '" />';
    echo '<input type="hidden" id="enableteacherproctor" name="enableteacherproctor" value="' . $enableteacherproctor . '" />';

    $headers = [
        get_string("email", "quizaccess_quizproctoring"),
        get_string("attempts", "quizaccess_quizproctoring"),
        get_string("started", "quizaccess_quizproctoring") .
        $OUTPUT->render(new help_icon('started', 'quizaccess_quizproctoring')),
        get_string("submitted", "quizaccess_quizproctoring") .
        $OUTPUT->render(new help_icon('submitted', 'quizaccess_quizproctoring')),
        get_string("duration", "quizaccess_quizproctoring") .
        $OUTPUT->render(new help_icon('duration', 'quizaccess_quizproctoring')),
        get_string("proctoringimages", "quizaccess_quizproctoring") .
        $OUTPUT->render(new help_icon('proctoringimages', 'quizaccess_quizproctoring')),
        get_string("proctoringidentity", "quizaccess_quizproctoring") .
        $OUTPUT->render(new help_icon('proctoringidentity', 'quizaccess_quizproctoring')),
        get_string("isautosubmit", "quizaccess_quizproctoring") .
        $OUTPUT->render(new help_icon('isautosubmit', 'quizaccess_quizproctoring')),
    ];

    if ($enableteacherproctor == 1) {
        $headers[] = get_string("teachersubmitted", "quizaccess_quizproctoring") .
            $OUTPUT->render(new help_icon('teachersubmitted', 'quizaccess_quizproctoring'));
    }

    if ($enableeyecheckreal == 1) {
        $headers[] = get_string("iseyeoff", "quizaccess_quizproctoring") .
            $OUTPUT->render(new help_icon('iseyeoff', 'quizaccess_quizproctoring'));
        $headers[] = get_string("iseyedisabledbyteacher", "quizaccess_quizproctoring") .
            $OUTPUT->render(new help_icon('iseyedisabledbyteacher', 'quizaccess_quizproctoring'));
    }
    $headers[] = get_string("generatereport", "quizaccess_quizproctoring") .
        $OUTPUT->render(new help_icon('generatereport', 'quizaccess_quizproctoring'));

    $btn = '';
    if (has_capability('quizaccess/quizproctoring:quizproctoringreport', $context)) {
        $backurl = new moodle_url('/mod/quiz/accessrule/quizproctoring/proctoringreport.php', [
            'cmid' => $cmid, 'quizid' => $quizid,
        ]);
        $btn = '<a class="btn btn-primary" href="' . $backurl . '">' .
            get_string('userimagereport', 'quizaccess_quizproctoring') .
            '</a>';
    }
    echo $OUTPUT->header();
    echo '<div class="headtitle">' .
        '<p>' . get_string('reviewattemptsu', 'quizaccess_quizproctoring', fullname($user)) . '</p>' .
        '<div>' . $btn . '</div>' .
        '</div><br/>';

    echo '<table id="attemptsreporttable" class="display" style="width:100%">';
    echo '<thead><tr>';
    foreach ($headers as $headcol) {
        echo '<th>' . $headcol . '</th>';
    }
    echo '</tr></thead>';
    echo '</table>';
    echo $OUTPUT->footer();
} else {
    redirect(new moodle_url('/'));
}
