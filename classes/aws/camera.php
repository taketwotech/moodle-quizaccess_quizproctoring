<?php
/**
 * API methods from AWS rekognition to detect camera pictures
 *
 * @package    quizaccess
 * @subpackage quizproctoring
 * @copyright  2020 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace quizaccess_quizproctoring\aws;

defined('MOODLE_INTERNAL') || die();
define('AWS_VERSION', 'latest');
define('AWS_REGION', 'us-east-1');

require_once($CFG->dirroot . '/mod/quiz/accessrule/quizproctoring/lib.php');
require_once($CFG->dirroot . '/mod/quiz/accessrule/quizproctoring/libraries/aws/aws-autoloader.php');

/**
 * API exposed by AWS, to be used by camera images.
 *
 * @copyright 2020 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

class camera {
    private static $amazon_api_key = null;
    private static $amazon_api_secret = null;
    private static $client = null;

    /**
     * Initialize key and token
     *
     * @return null 
     */
    public static function init() {
        global $CFG;
        self::$amazon_api_key = get_config('quizaccess_quizproctoring', 'aws_key');
        self::$amazon_api_secret = get_config('quizaccess_quizproctoring','aws_secret');
        self::$client = new \Aws\Rekognition\RekognitionClient([
            'version' => AWS_VERSION,
            'region' => AWS_REGION,
            'credentials' => [
                'key' => self::$amazon_api_key,
                'secret' => self::$amazon_api_secret
            ]
        ]);
    }    

    /**
     * Validate the image captured
     *
     * @return null 
     */
    public static function validate($source, $target = '') {
        global $CFG;
        $result = self::detect_faces($source);

        if (isset($result["FaceDetails"]) && count($result["FaceDetails"]) > 0) {
            $count = count($result["FaceDetails"]);
            if ($count  > 1) {
                return QUIZACCESS_QUIZPROCTORING_MULTIFACESDETECTED;
            } else if ($count == 1) {
                $eyesOpen = $result['FaceDetails'][0]['EyesOpen']['Value'];
                if (!$eyesOpen) {
                    return QUIZACCESS_QUIZPROCTORING_EYESNOTOPENED;
                } else if ($target !== '') {
                    $compareresult = self::compare_faces($source, $target);
                    if (!$compareresult || $compareresult < QUIZACCESS_QUIZPROCTORING_FACEMATCHTHRESHOLD) {
                        return QUIZACCESS_QUIZPROCTORING_FACESNOTMATCHED;
                    } else {
                        return self::check_protective_equipment($source);
                    }
                } else {
                    return self::check_protective_equipment($source);
                }
            } else {
                return null;
            }
        } else {
            return QUIZACCESS_QUIZPROCTORING_NOFACEDETECTED;
        }
    }

    /** 
     * Detect faces in an image
     *
     * @param $source
     * @return bool|int
     */
    public static function detect_faces($source) {
        $result = self::$client->detectFaces([
            'Image' => [
                'Bytes' => $source
            ],
            'Attributes' => ['ALL']
        ]);
        return $result;
    }

    /** 
     * Compare faces in source and target image
     *
     * @param $source
     * @return bool|int
     */
    public static function compare_faces($source, $target) {
        $result = self::$client->CompareFaces([
            'SourceImage' => [
                'Bytes' => $source
            ],
            'TargetImage' => [
                'Bytes' => $target
            ]
        ]);
        if (isset($result["FaceMatches"]) && isset($result["FaceMatches"][0]) && isset($result["FaceMatches"][0]["Similarity"])) {
            return $result["FaceMatches"][0]["Similarity"];
        }
        return false;
    }

    public static function check_protective_equipment($source) {
        $res_protective_equipment = self::detect_protective_equipment($source);
        if (isset($res_protective_equipment["Persons"]) && count($res_protective_equipment["Persons"]) > 0) {
            $persons = $res_protective_equipment["Persons"];
            foreach ($persons as $person) {
                $bodyParts = $person['BodyParts'];
                if (!empty($bodyParts)) {
                    foreach ($bodyParts as $bodyPart) {
                        if ($bodyPart['Name'] == 'FACE') {
                            if (empty($bodyPart['EquipmentDetections'])) {
                                return null;
                            } else {
                                return QUIZACCESS_QUIZPROCTORING_FACEMASKDETECTED;
                            }
                        }
                    }
                }
            }
        }
        return null;
    }

    public static function detect_protective_equipment($source) {
        $result = self::$client->detectProtectiveEquipment([
            'Image' => [
                'Bytes' => $source
            ],
            'SummarizationAttributes' => [
                'MinConfidence' => QUIZACCESS_QUIZPROCTORING_FACEMASKTHRESHOLD,
                'RequiredEquipmentTypes' => [
                    'FACE_COVER'
                ]
            ]
        ]);

        return $result;
    }
}