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
 * Force-refresh ProctorLink plan details.
 *
 * @package    quizaccess_quizproctoring
 * @copyright  2026 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../../../config.php');
require_once($CFG->dirroot . '/mod/quiz/accessrule/quizproctoring/lib.php');

require_login();
require_sesskey();

$returnto = optional_param('returnto', '', PARAM_ALPHA);
$cmid = optional_param('cmid', 0, PARAM_INT);
if (!$cmid) {
    $cmid = optional_param('update', 0, PARAM_INT);
}

$url = new moodle_url('/mod/quiz/accessrule/quizproctoring/refreshplan.php');
$PAGE->set_url($url);
$PAGE->set_context(context_system::instance());

if ($returnto === 'quiz' && $cmid) {
    $cm = get_coursemodule_from_id('quiz', $cmid, 0, false, MUST_EXIST);
    $context = context_module::instance($cm->id);
    $PAGE->set_context($context);
    require_capability('mod/quiz:manage', $context);
    $redirecturl = new moodle_url('/course/modedit.php', ['update' => $cmid]);
} else if ($returnto === 'admin') {
    require_capability('moodle/site:config', context_system::instance());
    $redirecturl = new moodle_url('/admin/settings.php', ['section' => 'modsettingsquizcatproctoring']);
} else {
    throw new moodle_exception('invalidaccess');
}

$result = quizaccess_quizproctoring_sync_plan_if_stale(true);

if ($result['plan'] || $result['userinfo']) {
    \core\notification::success(get_string('plansyncsuccess', 'quizaccess_quizproctoring'));
} else if (!$result['skipped']) {
    \core\notification::warning(get_string('plansyncfailed', 'quizaccess_quizproctoring'));
}

redirect($redirecturl);
