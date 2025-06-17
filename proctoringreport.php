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
$PAGE->set_context($context);
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
        $('#proctoringreporttable').DataTable({
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

    $('#exportpdf').on('click', function() {
        const button = $(this);
        button.prop('disabled', true).text('Generating PDF...');
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
                button.prop('disabled', false).text('Export Report to PDF');
            }
        });
    });

    $('#exportcsv').on('click', function() {
        const button = $(this);
        button.prop('disabled', true).text('Generating CSV...');
        $.ajax({
            url: M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/csvreport.php',
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
                button.prop('disabled', false).text('Export Report to CSV');
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
            if (file_exists($tempfilepath)) {
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
$table->id = 'proctoringreporttable';

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
$proctoringimageshow = get_config('quizaccess_quizproctoring', 'proctoring_image_show');
if ($proctoringimageshow == 1) {
    array_splice($headers, -1, 0, get_string("reviewattempts", "quizaccess_quizproctoring") .
        $OUTPUT->render(new help_icon('reviewattempts', 'quizaccess_quizproctoring')));
}
$table->head = $headers;
$output = $PAGE->get_renderer('mod_quiz');
echo $output->header();
$initialwarning = 0;
if (has_capability('quizaccess/quizproctoring:quizproctoringreport', $context)) {
    $url = $CFG->wwwroot . '/mod/quiz/accessrule/quizproctoring/imagesreport.php?cmid=' . $cmid;
    $btn = '<a class="btn btn-primary" href="' . $url . '">' .
        get_string("proctoringimagereport", "quizaccess_quizproctoring", $course->fullname) . '</a>';
}
echo '<div class="headtitle">' .
     '<p>' . get_string("delinformationu", "quizaccess_quizproctoring") . '</p>' .
     '<div>' . $btn . '</div>' .
     '</div><br/>';

$sql = "
SELECT 
    u.id,
    u.firstname,
    u.lastname,
    u.email,
    COUNT(DISTINCT mp.id) AS image_mcount,
    COUNT(DISTINCT CASE WHEN pd.userimg IS NOT NULL AND pd.userimg != '' THEN pd.id END) AS image_count,
    COUNT(DISTINCT CASE WHEN pd.status IS NOT NULL AND pd.status != '' THEN pd.id END) AS warning_count,
    MAX(mp.timecreated) AS last_attempt_time
FROM {user} u
JOIN {quizaccess_main_proctor} mp 
    ON mp.userid = u.id AND mp.quizid = :quizid1 AND mp.deleted = 0
LEFT JOIN {quizaccess_proctor_data} pd 
    ON pd.userid = u.id AND pd.quizid = :quizid2 AND pd.deleted = 0
WHERE mp.userimg IS NOT NULL AND mp.userimg != ''
GROUP BY u.id, u.firstname, u.lastname, u.email
ORDER BY u.firstname ASC
";

$params = [
    'quizid1' => $quizid,
    'quizid2' => $quizid,
];
$records = $DB->get_records_sql($sql, $params);
if (empty($records)) {
    $rows = [
        get_string('norecordsfound', 'quizaccess_quizproctoring'),
        '',
        '',
        '',
        '',
        '',
    ];
    if ($proctoringimageshow == 1) {
        array_splice($rows, -1, 0, '');
    }
    $table->data[] = $rows;
} else {
    foreach ($records as $record) {
        $namelink = html_writer::link(
            new moodle_url('/user/view.php', ['id' => $record->id]),
            $record->firstname . ' ' . $record->lastname
        );
        $deleteicon = '<a href="#" title="' . get_string('delete') . '"
             class="delete-icon" data-cmid="' . $cmid . '" data-quizid="' . $quizid . '" data-userid="' . $record->id . '"
        data-username="' . $record->firstname . ' ' . $record->lastname . '">
        <i class="icon fa fa-trash"></i></a>';

        $totalimagecount = $record->image_mcount + $record->image_count;
        $warningcount = $record->warning_count;
        $last_attempt_time = $record->last_attempt_time ? userdate($record->last_attempt_time, get_string('strftimerecent', 'langconfig')) : '-';

        $imgurl = $CFG->wwwroot . '/mod/quiz/accessrule/quizproctoring/reviewattempts.php?userid=' .
            $record->id . '&cmid=' . $cmid . '&quizid=' . $quizid;
        $imageicon = '<a href="'.$imgurl.'"><img class="imageicon" src="' .
        $OUTPUT->image_url('review-icon', 'quizaccess_quizproctoring') . '" alt="icon"></a>';

        $row = [$namelink, $record->email, $last_attempt_time, $totalimagecount, $warningcount];
        if ($proctoringimageshow == 1) {
            if (is_siteadmin($record->id) || has_capability('moodle/course:update',
                context_course::instance($course->id), $record->id)) {
                $row[] = '';
            } else {
                $row[] = $imageicon;
            }
        }
        $row[] = $deleteicon;
        $table->data[] = $row;
    }
}
echo '<button id="exportpdf" class="btn btn-secondary">'.get_string('exportpdf', 'quizaccess_quizproctoring').'</button>';
echo '<button id="exportcsv" class="btn btn-secondary">'.get_string('exportcsv', 'quizaccess_quizproctoring').'</button>';
echo html_writer::table($table);
echo $OUTPUT->footer();
