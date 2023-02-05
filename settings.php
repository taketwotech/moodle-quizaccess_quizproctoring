<?php

/**
 * Settings file for quizaccess proctoring
 *
 * @package    quizaccess
 * @subpackage quizproctoring
 * @copyright  2020 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die;

if ($hassiteconfig && !empty($USER->id)) {

    // Mangeto Mapping Settings
    $settings = new admin_settingpage('modsettingsquizcatproctoring', get_string('pluginname', 'quizaccess_quizproctoring'), 'moodle/site:config');

    $settings->add(new admin_setting_configtext('quizaccess_quizproctoring_aws_key',
        get_string('awskey', 'quizaccess_quizproctoring'),
        get_string('awskey_help', 'quizaccess_quizproctoring'),
        '',
        PARAM_TEXT));

    $settings->add(new admin_setting_configtext('quizaccess_quizproctoring_aws_secret',
        get_string('awssecret', 'quizaccess_quizproctoring'),
        get_string('awssecret_help', 'quizaccess_quizproctoring'),
        '',
        PARAM_TEXT));

    $settings->add(new admin_setting_configselect('quizaccess_quizproctoring_img_check_time', 
        get_string('proctoringtimeinterval', 'quizaccess_quizproctoring'), 
        get_string('help_timeinterval', 'quizaccess_quizproctoring'), 5,
        array(1 => '1 minute', 5 => '5 minutes', 10 => '10 minutes')));
}
