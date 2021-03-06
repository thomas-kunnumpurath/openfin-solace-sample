/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * Solace Web Messaging API for JavaScript
 * Publish/Subscribe tutorial - Topic Publisher
 * Demonstrates publishing direct messages to a topic
 */

/*jslint es6 browser devel:true*/
/*global solace*/

var OpenFinSolacePubSub = function (readTopicName,writeTopicName,subscriptionFunction) {
    'use strict';
    var openFinSolacePubSub = {};
    openFinSolacePubSub.session = null;
    openFinSolacePubSub.readTopicName = readTopicName;
    openFinSolacePubSub.writeTopicName = writeTopicName;

    // Logger
    openFinSolacePubSub.log = function (line) {
        var now = new Date();
        var time = [('0' + now.getHours()).slice(-2), ('0' + now.getMinutes()).slice(-2),
            ('0' + now.getSeconds()).slice(-2)];
        var timestamp = '[' + time.join(':') + '] ';
        console.log(timestamp + line);
        // var logTextArea = document.getElementById('log');
        // logTextArea.value += timestamp + line + '\n';
        // logTextArea.scrollTop = logTextArea.scrollHeight;
    };


    // Establishes connection to Solace message router
    openFinSolacePubSub.connect = function () {
        // extract params
        if (openFinSolacePubSub.session !== null) {
            openFinSolacePubSub.log('Already connected and ready to publish messages.');
            return;
        }
        var hosturl = 'ws://localhost:80';
        // check for valid protocols
        if (hosturl.lastIndexOf('ws://', 0) !== 0 && hosturl.lastIndexOf('wss://', 0) !== 0 &&
            hosturl.lastIndexOf('http://', 0) !== 0 && hosturl.lastIndexOf('https://', 0) !== 0) {
            openFinSolacePubSub.log('Invalid protocol - please use one of ws://, wss://, http://, https://');
            return;
        }

        var username = 'default';
        var pass = 'default';
        var vpn = 'default';

        if (!hosturl || !username || !pass || !vpn) {
            openFinSolacePubSub.log('Cannot connect: please specify all the Solace message router properties.');
            return;
        }
        openFinSolacePubSub.log('Connecting to Solace message router using url: ' + hosturl);
        openFinSolacePubSub.log('Client username: ' + username);
        openFinSolacePubSub.log('Solace message router VPN name: ' + vpn);
        // create session
        try {
            openFinSolacePubSub.session = solace.SolclientFactory.createSession({
                // solace.SessionProperties
                url:      hosturl,
                vpnName:  vpn,
                userName: username,
                password: pass,
            });
        } catch (error) {
            openFinSolacePubSub.log(error.toString());
        }
        // define session event listeners
        openFinSolacePubSub.session.on(solace.SessionEventCode.UP_NOTICE, function (sessionEvent) {
            openFinSolacePubSub.log('=== Successfully connected and ready to publish messages. ===');
            if(!openFinSolacePubSub.subscribed){
                          openFinSolacePubSub.subscribe();
             }
        });
        openFinSolacePubSub.session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, function (sessionEvent) {
            openFinSolacePubSub.log('Connection failed to the message router: ' + sessionEvent.infoStr +
                ' - check correct parameter values and connectivity!');
        });

        openFinSolacePubSub.session.on(solace.SessionEventCode.SUBSCRIPTION_ERROR, function (sessionEvent) {
                    openFinSolacePubSub.log('Cannot subscribe to topic: ' + sessionEvent.correlationKey);
                });
                openFinSolacePubSub.session.on(solace.SessionEventCode.SUBSCRIPTION_OK, function (sessionEvent) {

                        openFinSolacePubSub.subscribed = true;
                        openFinSolacePubSub.log('Successfully subscribed to topic: ' + sessionEvent.correlationKey);
                        openFinSolacePubSub.log('=== Ready to receive messages. ===');

                });
                // define message event listener
                openFinSolacePubSub.session.on(solace.SessionEventCode.MESSAGE, subscriptionFunction);


        openFinSolacePubSub.session.on(solace.SessionEventCode.DISCONNECTED, function (sessionEvent) {
            openFinSolacePubSub.log('Disconnected.');
            if (openFinSolacePubSub.session !== null) {
                openFinSolacePubSub.session.dispose();
                openFinSolacePubSub.session = null;
            }
        });
        // if secure connection, first load iframe so the browser can provide a client-certificate
        if (hosturl.lastIndexOf('wss://', 0) === 0 || hosturl.lastIndexOf('https://', 0) === 0) {
            var urlNoProto = hosturl.split('/').slice(2).join('/'); // remove protocol prefix
            document.getElementById('iframe').src = 'https://' + urlNoProto + '/crossdomain.xml';
        } else {
            openFinSolacePubSub.connectToSolace();   // otherwise proceed
        }
    };

    // Actually connects the session triggered when the iframe has been loaded - see in html code
    openFinSolacePubSub.connectToSolace = function () {
        try {
            openFinSolacePubSub.session.connect();
        } catch (error) {
            openFinSolacePubSub.log(error.toString());
        }
    };



     openFinSolacePubSub.subscribe = function () {
            if (openFinSolacePubSub.session !== null) {
                if (openFinSolacePubSub.subscribed) {
                    openFinSolacePubSub.log('Already subscribed to "' + openFinSolacePubSub.writeTopicName
                        + '" and ready to receive messages.');
                } else {
                    openFinSolacePubSub.log('Subscribing to topic: ' + openFinSolacePubSub.writeTopicName);
                    try {

                    openFinSolacePubSub.writeTopicName.forEach(function(value){
                        openFinSolacePubSub.session.subscribe(
                            solace.SolclientFactory.createTopicDestination(value),
                            true, // generate confirmation when subscription is added successfully
                            value, // use topic name as correlation key
                            10000 // 10 seconds timeout for this operation
                        )});
                    } catch (error) {
                        openFinSolacePubSub.log(error.toString());
                    }
                }
            } else {
                openFinSolacePubSub.log('Cannot subscribe because not connected to Solace message router.');
            }
        };

    // Gracefully disconnects from Solace message router
    openFinSolacePubSub.disconnect = function () {
        openFinSolacePubSub.log('Disconnecting from Solace message router...');
        if (openFinSolacePubSub.session !== null) {
            try {
                openFinSolacePubSub.session.disconnect();
            } catch (error) {
                openFinSolacePubSub.log(error.toString());
            }
        } else {
            openFinSolacePubSub.log('Not connected to Solace message router.');
        }
    };

    return openFinSolacePubSub;
};