# ev-simulator

## Summary

Simple [node.js](https://nodejs.org/) program to simulate a set of charging stations based on the OCPP-J 1.6 protocol.

## Start

To start the program, run: `npm start`.

## Configuration syntax

All configuration files are in the JSON standard format.  

The program's global configuration parameters must be within the src/assets/config.json file. A configuration template file is available at [src/assets/config-template.json](src/assets/config-template.json).

All charging station templates are in the directory [src/assets/station-templates](src/assets/station-templates).

A list of RFID tags must be defined for the automatic transaction generator with the default location and name src/assets/authorization-tags.json. A template file is available at [src/assets/authorization-tags-template.json](src/assets/authorization-tags-template.json).

### Global configuration 

**src/assets/config.json**:

Key | Value(s) | Default Value | Value type | Description 
--- | -------| --------------| ---------- | ------------
supervisionURLs | | [] | string[] |  array of connection URIs to OCPP-J servers
distributeStationsToTenantsEqually | true/false | true | boolean | distribute charging stations uniformly to the OCPP-J servers
statisticsDisplayInterval | | 60 | integer | seconds between charging stations statistics output in the logs 
workerProcess | workerSet/staticPool/dynamicPool | workerSet | string | worker threads process type           
workerPoolMinSize | | 4 | integer | worker threads pool minimum number of threads
workerPoolMaxSize | | 16 | integer | worker threads pool maximum number of threads
chargingStationsPerWorker | | 1 | integer | number of charging stations per worker threads for the `workerSet` process type
logConsole | true/false | false | boolean | output logs on the console 
logFormat | | simple | string | winston log format
logRotate | true/false | true | boolean | enable daily log files rotation
logMaxFiles | | 7 | integer | maximum number of files to keep
logLevel | emerg/alert/crit/error/warning/notice/info/debug | info | string | winston logging level
logFile | | combined.log | string | log file relative path
logErrorFile | | error.log | string | error log file relative path 
stationTemplateURLs | | {}[] | { file: string; numberOfStations: number; }[] | array of charging template file URIs
 
### Charging station template

Key | Value(s) | Default Value | Value type | Description 
--- | -------| --------------| ---------- | ------------
supervisionURL | | '' | string | connection URI to OCPP-J server
ocppVersion | 1.6 | 1.6 | string | OCPP version 
ocppProtocol | json | json | string | OCPP protocol
authorizationFile | | '' | string | RFID tags list file relative to src/assets path
baseName | | '' | string | base name to build charging stations name
nameSuffix | | '' | string | name suffix to build charging stations name
fixedName | true/false | false | boolean | use the baseName as the charging stations unique name
chargePointModel | | '' | string | charging stations model
chargePointVendor | | '' | string | charging stations vendor
chargeBoxSerialNumberPrefix | | '' | string | charging stations serial number prefix
firmwareVersion | | '' | string | charging stations firmware version
power | | | number\|number[] | charging stations maximum power value(s)
powerSharedByConnectors | true/false | false | boolean | charging stations power shared by connectors
powerUnit | W/kW | W | string | charging stations power unit

## License

This file and all other files in this repository are licensed under the Apache Software License, v.2 and copyrighted under the copyright in [NOTICE](NOTICE) file, except as noted otherwise in the [LICENSE](LICENSE) file.

Please note that Docker images can contain other software which may be licensed under different licenses. This LICENSE and NOTICE files are also included in the Docker image. For any usage of built Docker images please make sure to check the licenses of the artifacts contained in the images.
