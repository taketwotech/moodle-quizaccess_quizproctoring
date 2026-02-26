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
// along with Moodle. If not, see <http://www.gnu.org/licenses/>.

/**
 * AJAX endpoint for User Images Report (server-side DataTables).
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2026 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require_once(__DIR__ . '/../../../../config.php');
require_once($CFG->dirroot . '/mod/quiz/accessrule/quizproctoring/lib.php');

$cmid = required_param('cmid', PARAM_INT);
$courseid = required_param('courseid', PARAM_INT);

require_login();
$context = context_module::instance($cmid);
$PAGE->set_context($context);
require_capability('quizaccess/quizproctoring:quizproctoringoverallreport', $context);

global $DB, $CFG, $OUTPUT;

$course = get_course($courseid);
$draw = optional_param('draw', 1, PARAM_INT);
$start = optional_param('start', 0, PARAM_INT);
$defaultlength = quizaccess_quizproctoring_get_reporting_pagination();
$length = optional_param('length', $defaultlength, PARAM_INT);
if (!in_array($length, [10, 25, 50, 100], true)) {
    $length = $defaultlength;
} else {
    quizaccess_quizproctoring_set_reporting_pagination($length);
}

$searchvalue = '';
if (isset($_POST['search']['value'])) {
    $searchvalue = trim($_POST['search']['value']);
}

$columns = ['quizname', 'total_users', 'total_images', 'actions', 'actionas'];
$ordercol = 'quizname';
$orderdir = 'ASC';
if (!empty($_POST['order'][0]['column']) && isset($_POST['order'][0]['dir'])) {
    $colindex = (int) $_POST['order'][0]['column'];
    $orderdir = strtoupper($_POST['order'][0]['dir']) === 'DESC' ? 'DESC' : 'ASC';
    if (isset($columns[$colindex])) {
        switch ($columns[$colindex]) {
            case 'quizname':
                $ordercol = 'quizname';
                break;
            case 'total_users':
                $ordercol = 'total_users';
                break;
            case 'total_images':
                $ordercol = 'total_images';
                break;
            default:
                $ordercol = 'quizname';
        }
    }
}

$basewhere = 'q.course = :courseid';
$params = ['courseid' => $courseid];
if ($searchvalue !== '') {
    $basewhere .= ' AND (' . $DB->sql_like('q.name', ':searchname', false) . ')';
    $params['searchname'] = '%' . $DB->sql_like_escape($searchvalue) . '%';
}

$countsql = "SELECT COUNT(q.id) FROM {quiz} q WHERE $basewhere";
$recordstotal = $DB->count_records_sql($countsql, $params);
$recordsfiltered = $recordstotal;

$basesql = "SELECT
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
WHERE $basewhere";

$sql = "SELECT * FROM ($basesql) sub ORDER BY $ordercol $orderdir";
$records = $DB->get_records_sql($sql, $params, $start, $length);

$data = [];
foreach ($records as $record) {
    if ($record->total_images == 0) {
        $deleteicon = '<span title="' . get_string('delete') . '" class="delete-quizs disabled"
            style="opacity: 0.5; cursor: not-allowed;">
            <i class="icon fa fa-trash"></i>
        </span>';
    } else {
        $deleteicon = '<a href="#" title="' . get_string('delete') . '"
            class="delete-quiz" data-cmid="' . $cmid . '" data-quizid="' . $record->quizid . '"
            data-quiz="' . s($record->quizname) . '">
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
            data-quiz="' . s($record->quizname) . '">
            <i class="icon fa fa-trash"></i></a>';
    }
    $quizcm = get_coursemodule_from_instance('quiz', $record->quizid, $course->id);
    $backurl = new moodle_url('/mod/quiz/accessrule/quizproctoring/proctoringreport.php', [
        'cmid' => $quizcm->id,
        'quizid' => $record->quizid,
    ]);
    $helptext = get_string('hoverhelptext', 'quizaccess_quizproctoring', $record->quizname);
    $quiznamehtml = '<a href="' . $backurl . '" title="' . s($helptext) . '">' . s($record->quizname) . '</a>';

    $data[] = [
        $quiznamehtml,
        (int) $record->total_users,
        (int) $record->total_images,
        $deleteicon,
        $deleteaudioicon,
    ];
}

echo json_encode([
    'draw' => (int) $draw,
    'recordsTotal' => (int) $recordstotal,
    'recordsFiltered' => (int) $recordsfiltered,
    'data' => $data,
]);
