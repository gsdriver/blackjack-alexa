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

var APP_ID = "amzn1.ask.skill.5c69fc59-ea7a-4cc8-b8e6-dd200a5ba9aa"; 

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
    // Basic Strategy Intent
    "BasicStrategyIntent": function (intent, session, response) {
        var dealerSlot = intent.slots.DealerCard;
        var dealerCard;
        var playerHand = {cards:[], total:0, isSoft:false};
        var suggestion;
        var speechError = null;
        var speechOutput;
        var repromptOutput;

        // OK, let's get the player total and whether it's hard or soft - from there we'll
        // set up the hand appropriately
        speechError = BuildPlayerHand(intent.slots, playerHand);

        // And the dealer
        if (dealerSlot && dealerSlot.value) {
            dealerCard = GetCardValue(dealerSlot.value);
        }
        if (!dealerCard || (dealerCard < 1) || (dealerCard > 10)) {
            speechError = "I'm sorry, I did not hear a dealer card.  What else can I help with?";
        }

        // We need to convert this into a hand we can pass in - for now, we'll just use a 2 or 10 along with the balance
        // and pass that in (yes, I know this doesn't cover pair of Aces, but bare with me for now)
        var cardTitle = "Basic Strategy Suggestion";

        if (speechError)
        {
            speechOutput = {
                speech: speechError,
                type: AlexaSkill.speechOutputType.PLAIN_TEXT
            };
            repromptOutput = {
                speech: "What else can I help with?",
                type: AlexaSkill.speechOutputType.PLAIN_TEXT
            };
            response.ask(speechOutput, repromptOutput);
        }
        else {
            suggestion = GetSuggstion(playerHand, dealerCard);
            speechOutput = {
                speech: suggestion.speechText,
                type: AlexaSkill.speechOutputType.PLAIN_TEXT
            };
            response.tellWithCard(speechOutput, cardTitle, suggestion.action);
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

function GetCardValue(card)
{
    const mapping = [
        {card:"ace", value:1},
        {card:"jack", value:10},
        {card:"queen", value:10},
        {card:"king", value:10},
        {card:"aces", value:1},
        {card:"jacks", value:10},
        {card:"queens", value:10},
        {card:"kings", value:10}
    ];
    
    // Lookup in mapping table
    for (var i = 0; i < mapping.length; i++)
    {
        if (mapping[i].card == card)
        {
            return mapping[i].value;
        }
    }  

    // Nope, not there - see if you can just convert to a number
    return parseInt(card);
}

function BuildPlayerHand(slots, playerHand)
{
    var error = null;
    var isSoft;
    var playerTotal;
    var pairCard = 0;

    // OK, let's get the player total and whether it's hard or soft - from there we'll
    // set up the hand appropriately
    if (slots.HardTotal && slots.HardTotal.value) {
        playerTotal = parseInt(slots.HardTotal.value);
        isSoft = false;
    } else if (slots.SoftTotal && slots.SoftTotal.value) {
        playerTotal = parseInt(slots.SoftTotal.value);
        isSoft = true;
    } else if (slots.PairCard && slots.PairCard.value) {
        pairCard = GetCardValue(slots.PairCard.value);
        playerTotal = pairCard * 2;
        if (playerTotal == 2) {
            playerTotal == 12;
        }
        isSoft = false;
    }

    // Check that the total is something we can handle
    if (!playerTotal) {
        error = "I'm sorry, I didn't hear a player total.  What else can I help with?";
    }
    else if ((playerTotal < 2) || (playerTotal > 21)) {
        error = "I'm sorry, the player total must be between 2 and 21 inclusive.  What else can I help with?";
    }
    else if (isSoft && (playerTotal < 12)) {
        error = "I'm sorry, soft player totals must be at least 12.  What else can I help with?";
    }
    else 
    {
        // We need to convert this into a hand we can pass in
        if (pairCard) {
            playerHand.cards.push(pairCard);
            playerHand.cards.push(pairCard);
        } else if (isSoft) {
            playerHand.cards.push(1);
            playerHand.cards.push(playerTotal - 11);
        } else {
            playerHand.cards.push(playerTotal > 11) ? 10 : 2;
            playerHand.cards.push(playerTotal - playerHand.cards[0]);
        }
        playerHand.isSoft = isSoft;
        playerHand.total = playerTotal;
    }

    return error;
}

function GetSuggstion(playerHand, dealerCard)
{
    var suggest = {speechText: "", action: ""};
    var isPair;
                
    // BUGBUG: We'll just use default set of rules for now
    suggest.action = strategy.GetRecommendedPlayerAction(playerHand.cards, dealerCard, 1, true, {strategyComplexity: "advanced"});
    if (suggest.action == "noinsurance")
    {
        return "You should never take insurance";
    }

    isPair = (playerHand.cards.length == 2) && (playerHand.cards[0] == playerHand.cards[1]);

    suggest.speechText = "You should " + suggest.action + " with ";
    if (isPair)
    {
        suggest.speechText += "a pair of ";
        suggest.speechText += (playerHand.cards[0] == 1) ? "aces" : (playerHand.cards[0] + "s");
    }
    else
    {
        suggest.speechText += (playerHand.isSoft ? "soft " : "") + playerHand.total;
    }

    suggest.speechText +=  " against ";
    suggest.speechText += ((dealerCard == 1) || (dealerCard == 8)) ? "an " : "a ";
    suggest.speechText += (dealerCard == 1) ? "ace" : dealerCard;

    if (suggest.action == "double")
    {
        // Try again with a no double rule
        var suggestion = strategy.GetRecommendedPlayerAction(playerHand.cards, dealerCard, 1, true, {strategyComplexity: "advanced", doubleRange:[0,0]});
        suggest.speechText += ". If double is not allowed, you should " + suggestion;
    }
    else if (suggest.action == "surrender")
    {
        // Try again with no surrender
        var suggestion = strategy.GetRecommendedPlayerAction(playerHand.cards, dealerCard, 1, true, {strategyComplexity: "advanced", surrender:"none"});
        suggest.speechText += ". If surrender is not allowed, you should " + suggestion;
    }

    return suggest;    
}


exports.handler = function (event, context) 
{
    var bj = new Blackjack();
    bj.execute(event, context);
};
