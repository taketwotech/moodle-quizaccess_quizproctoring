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
 * API methods to detect camera pictures
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2020 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace quizaccess_quizproctoring;

defined('MOODLE_INTERNAL') || die();
require_once($CFG->libdir . '/filelib.php');

use lang_string;
use curl;

require_once($CFG->dirroot . '/mod/quiz/accessrule/quizproctoring/lib.php');

/**
 * API exposed, to be used by camera images.
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright 2020 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Provides all the functions for facematch call
 */
class api {

    /** @var API serviceurl */
    private static $serviceurl = null;

    /** @var API accesstoken */
    private static $accesstoken = null;

    /** @var API accesstokensecret */
    private static $accesstokensecret = null;

    /**
     * Initialize Facematch Endpoint
     *
     * @return null
     */
    public static function init() {
        global $CFG;
        self::$serviceurl = get_config('quizaccess_quizproctoring', 'external_server');
        self::$accesstoken = get_config('quizaccess_quizproctoring', 'accesstoken');
        self::$accesstokensecret = get_config('quizaccess_quizproctoring', 'accesstokensecret');
    }

    /**
     * Get the rest url to connect to
     *
     * @return string
     */
    public static function get_rest_url() {
        return self::$serviceurl;
    }

    /**
     * Get the access token
     *
     * @return string
     */
    public static function get_access_token() {
        return self::$accesstoken;
    }

    /**
     * Get the access token secret
     *
     * @return string
     */
    public static function get_access_token_secret() {
        return self::$accesstokensecret;
    }


    /**
     * Validate the image captured
     *
     * @param Longtext $imagedata data
     * @return string
     */
    public static function proctor_image_api($imagedata) {
        self::init();
        $curl = new \curl();
        $url = self::$serviceurl;
        $url = $url.'validate';
        $accesstoken = self::$accesstoken;
        $accesstokensecret = self::$accesstokensecret;
        $header = array('Content-Type: application/json',
                        'secret-key: ' . $accesstoken,
                        'secret-code: ' . $accesstokensecret
                    );
        $curl->setHeader($header);
        $result = $curl->post($url, $imagedata);
        return $result;
    }

    /**
     * Validate the image captured
     *
     * @param Longtext $response data
     * @param Longtext $source data
     * @param Longtext $target data
     * @return string
     */
    public static function validate($response, $source, $target = '') {
        global $CFG;
        self::init();
        $result = json_decode($response, true);
        if (isset($result["FaceDetails"]) && count($result["FaceDetails"]) > 0) {
            $count = count($result["FaceDetails"]);
            if ($count > 1) {
                return QUIZACCESS_QUIZPROCTORING_MULTIFACESDETECTED;
            } else if ($count == 1) {
                $eyesopen = $result['FaceDetails'][0]['EyesOpen']['Value'];
                if ($eyesopen === false) {
                    return QUIZACCESS_QUIZPROCTORING_EYESNOTOPENED;
                } else if ($target !== '') {
                    $compareresult = self::compare_faces($response);
                    if (!$compareresult || $compareresult < QUIZACCESS_QUIZPROCTORING_FACEMATCHTHRESHOLDT) {
                        return QUIZACCESS_QUIZPROCTORING_FACESNOTMATCHED;
                    }
                }
            } else {
                return null;
            }
        } else {
            return QUIZACCESS_QUIZPROCTORING_NOFACEDETECTED;
        }
    }

    /**
     * Compare faces
     *
     * @param Longtext $response data
     * @return string
     */
    public static function compare_faces($response) {
        $result = json_decode($response, true);
        if (isset($result["FaceMatches"]) && isset($result["FaceMatches"][0]["Face"])
            && isset($result["FaceMatches"][0]["Similarity"])) {
            return $result["FaceMatches"][0]["Similarity"];
        }
        return false;
    }

    /**
     * Merge Video
     *
     * @param Longtext $postdata
     * @return string
     */
    public static function merge_video_api($postdata) {
        self::init();
        $curl = curl_init();
        $url = self::$serviceurl;
        $url = $url.'mergeVideos';

        curl_setopt_array($curl, array(
              CURLOPT_URL => $url,
              CURLOPT_RETURNTRANSFER => true,
              CURLOPT_ENCODING => '',
              CURLOPT_MAXREDIRS => 10,
              CURLOPT_TIMEOUT => 0,
              CURLOPT_FOLLOWLOCATION => true,
              CURLOPT_SSL_VERIFYHOST => false,
              CURLOPT_SSL_VERIFYPEER => false,
              CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
              CURLOPT_CUSTOMREQUEST => 'POST',
              CURLOPT_POSTFIELDS => $postdata,
              CURLOPT_HTTPHEADER => array(
                'Content-Type: application/json'
              ),
        ));
        $result = curl_exec($curl);
        return $result;
    }
}
