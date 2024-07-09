# OCPP2 Mock Server

This project includes an Open Charge Point Protocol (OCPP) version 2.0.1 mock server implemented in Python.
https://github.com/mobilityhouse/ocpp/blob/master/ocpp/v201/enums.py

## Prerequisites

This project requires Python 3.7+ and [poetry](https://python-poetry.org/) to install the required packages:

```shell
pip install poetry
```

then

```shell
poetry install
```

## Running the Server

To start the server, run the `server.py` script:

```shell
poetry run task server
```

or

```shell
poetry run task server --request GetBaseReport --period 5
```

The server will start listening for connections on port 9000.

## Overview of the Server Scripts

### Server.py

The server script waits for connections from clients. When a client connects, the server creates a new instance of the `ChargePoint` class. This class includes methods for handling various OCPP messages, most of which return a dummy response.

The server script uses the `websockets` and `ocpp` libraries to facilitate the implementation.

## Development

### Code formatting

```shell
poetry run task format
```

### Code linting

```shell
poetry run task lint
```

## Note

Primarily, this software is intended for testing applications. The server script don't adhere to the full OCPP specifications and it is advised not to use them in a production environment without additional development.

For reference:
https://github.com/mobilityhouse/ocpp
