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
 * Proctoring events file.
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2024 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */


defined('MOODLE_INTERNAL') || die();

/**
 * Post-install script
 */
function xmldb_quizaccess_quizproctoring_install() {
    global $DB, $USER;

    set_config('enablemobilewebservice', true);
    set_config('enablewebservices', true);
    set_config('webserviceprotocols', 'xmlrpc,rest');

    $system_context = context_system::instance();
    $userRole = $DB->get_record('role', array('shortname' => 'user'));
    if ($userRole) {
        assign_capability('webservice/xmlrpc:use', CAP_ALLOW, $userRole->id, $system_context->id, true);
        assign_capability('webservice/rest:use', CAP_ALLOW, $userRole->id, $system_context->id, true);
        assign_capability('moodle/webservice:createtoken', CAP_ALLOW, $userRole->id, $system_context->id, true);
    }
    $user = $DB->get_record('user', ['id' => $USER->id], '*', MUST_EXIST);

    $record = new stdClass();
    $record->firstname = $user->firstname;
    $record->lastname  = $user->lastname;
    $record->email     = $user->email;
    $record->moodle_v  = get_config('moodle', 'release');    
    $record->previously_installed_v = '';

    $postdata = json_encode($record);

    $curl = new \curl();
    $url = 'https://proctoring.taketwotechnologies.com/create';
    $header = [
        'Content-Type: application/json',
    ];
    $curl->setHeader($header);
    $result = $curl->post($url, $postdata);
}
