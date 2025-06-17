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
list($course, $cm) = get_course_and_cm_from_cmid($cmid, 'quiz');
require_login($course, true, $cm);
require_capability('quizaccess/quizproctoring:quizproctoringoverallreport', $context);
$proctoringimageshow = get_config('quizaccess_quizproctoring', 'proctoring_image_show');
if ($proctoringimageshow == 1) {
    $PAGE->set_url(new moodle_url('/mod/quiz/accessrule/quizproctoring/reviewattempts.php', [
        'userid' => $userid, 'cmid' => $cmid, 'quizid' => $quizid
    ]));
    $PAGE->set_title(get_string('reviewattempts', 'quizaccess_quizproctoring'));

    $PAGE->navbar->add(get_string('quizaccess_quizproctoring', 'quizaccess_quizproctoring'),
        '/mod/quiz/accessrule/quizproctoring/reviewattempts.php');
    $PAGE->requires->js(new moodle_url('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'), true);
    $PAGE->requires->js(new moodle_url('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'), true);
    $PAGE->requires->css(new moodle_url('https://cdn.datatables.net/1.13.4/css/jquery.dataTables.min.css'));
    $PAGE->requires->js(new moodle_url('https://code.jquery.com/jquery-3.7.0.min.js'), true);
    $PAGE->requires->js(new moodle_url('https://cdn.datatables.net/1.13.4/js/jquery.dataTables.min.js'), true);
    $PAGE->requires->js_init_code("
        $(document).ready(function() {
                $('#attemptsreporttable').DataTable({
                pageLength: 10,
                lengthMenu: [ [10, 25, 50, -1], [10, 25, 50, 'All'] ],
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
        'attemptstarted', 'proctoringidentity', 'allimages'], 'quizaccess_quizproctoring');
    $PAGE->requires->css(new moodle_url($CFG->wwwroot . '/mod/quiz/accessrule/quizproctoring/libraries/css/lightbox.min.css'));
    $PAGE->requires->js(new moodle_url($CFG->wwwroot . '/mod/quiz/accessrule/quizproctoring/libraries/js/lightbox.min.js'), true);

    $storerecord = $DB->get_record('quizaccess_quizproctoring', ['quizid' => $cm->instance]);
    echo '<input type="hidden" id="storeallimages" name="storeallimages" value="'.$storerecord->storeallimages.'" />';

    $table = new html_table();
    $table->id = 'attemptsreporttable';

    $table->head = [
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
        get_string("iseyeoff", "quizaccess_quizproctoring") .
        $OUTPUT->render(new help_icon('iseyeoff', 'quizaccess_quizproctoring')),
        get_string("generatereport", "quizaccess_quizproctoring") .
        $OUTPUT->render(new help_icon('generatereport', 'quizaccess_quizproctoring')),
    ];

    echo $OUTPUT->header();

    $btn = '';
    if (has_capability('quizaccess/quizproctoring:quizproctoringreport', $context)) {
        $backurl = new moodle_url('/mod/quiz/accessrule/quizproctoring/proctoringreport.php', [
            'cmid' => $cmid, 'quizid' => $quizid
        ]);
        $btn = '<a class="btn btn-primary" href="'.$backurl.'">'.get_string("userimagereport", "quizaccess_quizproctoring").'</a>';
    }

    echo '<div class="headtitle">' .
        '<p>' . get_string('reviewattemptsu', 'quizaccess_quizproctoring', fullname($user)) . '</p>' .
        '<div>' . $btn . '</div>' .
        '</div><br/>';

    $namelink = html_writer::link(
        new moodle_url('/user/view.php', ['id' => $user->id]),
        $user->email
    );

    $totalattempts = $DB->count_records('quizaccess_main_proctor', [
        'quizid' => $quizid, 'userid' => $userid, 'image_status' => 'M'
    ]);

    $records = $DB->get_records_sql("SELECT *
    FROM {quizaccess_main_proctor}
    WHERE quizid = :quizid AND userid = :userid
    AND image_status = :status AND deleted = 0
    ORDER BY attemptid DESC
", ['quizid' => $quizid, 'userid' => $userid, 'status' => 'M']);
    if (empty($records)) {
        $table->data[] = [
            get_string('norecordsfound', 'quizaccess_quizproctoring'),
            '',
            '',
            '',
            '',
            '',
            '',
            '',
        ];
    } else {
        foreach ($records as $record) {
            $attempt = $DB->get_record('quiz_attempts', [
                'quiz' => $quizid,
                'userid' => $userid,
                'id' => $record->attemptid,
            ]);

            $attemptsurl = new moodle_url('/mod/quiz/review.php', ['attempt' => $attempt->id]);
            $attempturl = '<a href="' . $attemptsurl->out() . '">' . $attempt->attempt . '</a>';

            $finishtime = $timetaken = get_string('inprogress', 'quiz');
            $timestart = userdate($attempt->timestart, get_string('strftimerecent', 'langconfig'));
            if ($attempt->timefinish) {
                $finishtime = userdate($attempt->timefinish, get_string('strftimerecent', 'langconfig'));
                $timetaken = format_time($attempt->timefinish - $attempt->timestart);
            }

            $pimages = '<img class="imageicon proctoringimage" data-attemptid="'.$attempt->id.'"
                data-quizid="'.$quizid.'" data-userid="'.$user->id.'" data-startdate="'.$timestart.'"
                data-all="false" src="' . $OUTPUT->image_url('icon', 'quizaccess_quizproctoring') . '" alt="icon">';

            $pindentity = '';
            if (!empty($record->user_identity)) {
                $pindentity = '<img class="imageicon proctoridentity" data-attemptid="'.$attempt->id.'"
                    data-quizid="'.$quizid.'" data-userid="'.$user->id.'" src="' . $OUTPUT->image_url('identity',
                    'quizaccess_quizproctoring') . '" alt="icon">';
            }

            if ($record->isautosubmit) {
                $submit = '<div class="submittag">Yes</div>';
            } else {
                $submit = 'No';
            }
            if ($record->iseyecheck) {
                $submiteye = 'No';
            } else {
                $submiteye = '<div class="submittag">Yes</div>';
            }
            $generate = '<button data-attemptid="'.$attempt->id.'" data-username="'.$user->username.'"
                        data-quizid="'.$quizid.'" data-userid="'.$user->id.'" class="btn btn-warning generate">'.get_string('generate', 'quizaccess_quizproctoring').'</button>';
            $row = [$namelink, $attempturl, $timestart, $finishtime, $timetaken, $pimages, $pindentity, $submit, $submiteye, $generate];
            $table->data[] = $row;
        }
    }

    echo html_writer::table($table);
    echo $OUTPUT->footer();

} else {
    redirect(new moodle_url('/'));
}
