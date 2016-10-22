/*
 * MIT License

 * Copyright (c) 2016 Garrett Vargas

 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:

 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

'use strict';

var AlexaSkill = require('./AlexaSkill');
var strategy = require('blackjack-strategy');

var APP_ID = undefined; //OPTIONAL: replace with 'amzn1.echo-sdk-ams.app.[your-unique-value-here]';

/**
 * MinecraftHelper is a child of AlexaSkill.
 * To read more about inheritance in JavaScript, see the link below.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Introduction_to_Object-Oriented_JavaScript#Inheritance
 */
var Blackjack = function () {
    AlexaSkill.call(this, APP_ID);
};

// Extend AlexaSkill
Blackjack.prototype = Object.create(AlexaSkill.prototype);
Blackjack.prototype.constructor = Blackjack;

Blackjack.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) 
{
    var speechText = "Welcome to the Blackjack Basic Strategy helper. You can ask a question like, what should I do with a 14 against a dealer 10? ... Now, what can I help you with.";
    
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    var repromptText = "For instructions on what you can say, please say help me.";
    response.ask(speechText, repromptText);
};

Blackjack.prototype.intentHandlers = {
    "BasicStrategyIntent": function (intent, session, response) {
        var dealerSlot = intent.slots.DealerCard;
        var playerTotal, dealerCard;
        var speech;
        var speechOutput;
        var repromptOutput;
        var isSoft;

        // OK, let's get the player total and whether it's hard or soft - from there we'll
        // set up the hand appropriately
        // BUGBUG - Pairs are not handled yet
        if (intent.slots.HardTotal && intent.slots.HardTotal.value) {
            playerTotal = parseInt(intent.slots.HardTotal.value);
            isSoft = false;
        } else if (intent.slots.SoftTotal && intent.slots.SoftTotal.value) {
            playerTotal = parseInt(intent.slots.SoftTotal.value);
            isSoft = true;
        }

        if (dealerSlot && dealerSlot.value) {
            // BUGBUG: For now you have to say "1" rather than ACE; "10" rather than Jack, Queen, King
            dealerCard = parseInt(dealerSlot.value);
        }

        // We need to convert this into a hand we can pass in - for now, we'll just use a 2 or 10 along with the balance
        // and pass that in (yes, I know this doesn't cover pair of Aces, but bare with me for now)
        var playerCards = [];
        var cardTitle = "Basic Strategy Suggestion";

        // Check that the total is something we can handle - at the moment we can only process 3-21
        if (!playerTotal || (playerTotal < 3) || (playerTotal > 21)) {
            speech = "I'm sorry, the player total must be between 3 and 21 inclusive.  What else can I help with?";
            speechOutput = {
                speech: speech,
                type: AlexaSkill.speechOutputType.PLAIN_TEXT
            };
            repromptOutput = {
                speech: "What else can I help with?",
                type: AlexaSkill.speechOutputType.PLAIN_TEXT
            };
            response.ask(speechOutput, repromptOutput);
        }
        else if (isSoft && (playerTotal < 12)) {
            speech = "I'm sorry, soft player totals must be at least 12.  What else can I help with?";
            speechOutput = {
                speech: speech,
                type: AlexaSkill.speechOutputType.PLAIN_TEXT
            };
            repromptOutput = {
                speech: "What else can I help with?",
                type: AlexaSkill.speechOutputType.PLAIN_TEXT
            };
            response.ask(speechOutput, repromptOutput);
        }
        else if (!dealerCard || (dealerCard < 1) || (dealerCard > 10)) {
            speech = "I'm sorry, the Dealer card must be a number between 1 and 10. Please say 1 for Ace and 10 for all face cards.  What else can I help with?";
            speechOutput = {
                speech: speech,
                type: AlexaSkill.speechOutputType.PLAIN_TEXT
            };
            repromptOutput = {
                speech: "What else can I help with?",
                type: AlexaSkill.speechOutputType.PLAIN_TEXT
            };
            response.ask(speechOutput, repromptOutput);
        }
        else {
            if (isSoft) {
                playerCards.push(1);
                playerCards.push(playerTotal - 11);
            } else {
                playerCards.push(playerTotal > 11) ? 10 : 2;
                playerCards.push(playerTotal - playerCards[0]);
            }

            // BUGBUG: We'll just use default set of rules for now
            var suggest = strategy.GetRecommendedPlayerAction(playerCards, dealerCard, 1, true);
            speechOutput = {
                speech: "You should " + suggest + " with " + (isSoft ? "soft " : "") + playerTotal + " against a " + dealerCard,
                type: AlexaSkill.speechOutputType.PLAIN_TEXT
            };
            response.tellWithCard(speechOutput, cardTitle, suggest);
        }
    },
    // Stop intent
    "AMAZON.StopIntent": function (intent, session, response) {
        var speechOutput = "Goodbye";
        response.tell(speechOutput);
    },
    // Cancel intent - for now we are session-less so does the same as goodbye
    "AMAZON.CancelIntent": function (intent, session, response) {
        var speechOutput = "Goodbye";
        response.tell(speechOutput);
    },
    // Help intent - provide help
    "AMAZON.HelpIntent": function (intent, session, response) {
        var speechText = "You can ask questions such as, what should I do with a 14 against dealer 10, or, you can say exit... Now, what can I help you with?";
        var repromptText = "You can say things like, what should I do with a 14 against dealer 10, or you can say exit... Now, what can I help you with?";
        var speechOutput = {
            speech: speechText,
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        var repromptOutput = {
            speech: repromptText,
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        response.ask(speechOutput, repromptOutput);
    }
};

exports.handler = function (event, context) 
{
    var bj = new Blackjack();
    bj.execute(event, context);
};
