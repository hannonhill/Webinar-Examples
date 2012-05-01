 // Global constants: (default values are overriden by loaded resource files)
var PLAYGROUND_WIDTH    = 700;
var PLAYGROUND_HEIGHT   = 250;
var REFRESH_RATE        = 15;
var BACKGROUND_COLOR = "black";

var GRACE       = 2000;
var ENEMY_MISSILE_SPEED = 10; //px per frame
var PLAYER_MISSILE_SPEED = 10; //px per frame
var SPAWN_RATE = 1000; // in MS

var PLAYER_LIVES = 3;
var PLAYER_SHIELD = 3;

var PLAYER_VERT_SPEED = 3;
var PLAYER_HORZ_SPEED = 5;

// Enemy config 
var enemyConfigs = new Array();

// Gloabl animation holder
var playerAnimation = new Array();
var missile = new Array();
var enemies = new Array(); 

// Game state
var bossMode = false;
var bossName = null;
var playerHit = false;
var timeOfRespawn = 0;
var gameOver = false;

// backgrounds
var backgroundLayers = new Array();

// Configuration files
var generalConfigURL = "[system-view:internal]/render/page.act?type=page&id=fdc6f2ed0a00016a0195bfcd06e695a4[/system-view:internal][system-view:external][system-asset:configuration=html]/GameWebinar/gameQuery/demos/3/General Game Configuration[/system-asset][/system-view:external]";
var playerConfigURL = "[system-view:internal]/render/page.act?type=page&id=ff365f920a00016a0195bfcd3bd29ca7[/system-view:internal][system-view:external][system-asset:configuration=html]/GameWebinar/gameQuery/demos/3/Player Configuration[/system-asset][/system-view:external]";
var enemiesConfigURL = "[system-view:internal]/render/page.act?type=page&id=00029f4c0a00016a0195bfcd71ff5b09[/system-view:internal][system-view:external][system-asset:configuration=html]/GameWebinar/gameQuery/demos/3/Player Configuration[/system-asset][/system-view:external]";

// Some hellper functions : 

// Function to restart the game:
function restartgame(){
    window.location.reload();
};

function explodePlayer(playerNode){
    playerNode.children().hide();
    playerNode.addSprite("explosion",{animation: playerAnimation["explode"], width: playerAnimation["explode"].spriteWidth, height: playerAnimation["explode"].spriteHeight})
    playerHit = true;
}


// Game objects:
function Player(node, lives, shields){

    this.node = node;
    //this.animations = animations;

    this.grace = false;
    this.maxShield = shields;
    this.replay = lives; 
    this.shield = this.maxShield; 
    this.respawnTime = -1;
    this.score = 0;
    
    // This function increases the player score for destroying the enemy
    this.tallyPoints = function(enemy){
        if ( enemy )
            this.score = this.score + enemy.pointValue;
    }
    
    // This function damage the ship and return true if this cause the ship to die 
    this.damage = function(){
        if(!this.grace){
            this.shield--;
            if (this.shield == 0){
                return true;
            }
            return false;
        }
        return false;
    };
    
    // this try to respawn the ship after a death and return true if the game is over
    this.respawn = function(){
        this.replay--;
        if(this.replay==0){
            return true;
        }
        
        this.grace  = true;
        this.shield = this.maxShield;
        
        this.respawnTime = (new Date()).getTime();
        $(this.node).fadeTo(0, 0.5); 
        return false;
    };
    
    this.update = function(){
        if((this.respawnTime > 0) && (((new Date()).getTime()-this.respawnTime) > 3000)){
            this.grace = false;
            $(this.node).fadeTo(500, 1); 
            this.respawnTime = -1;
        }
    }
    
    return true;
}

function Enemy(node){
    this.shield = 2;
    this.speedx = -5;
    this.speedy = 0;
    this.pointValue = 0;
    this.node = $(node);
    this.explodeAnimation = null;
    
    // deals with damage endured by an enemy
    this.damage = function(){
        this.shield--;
        if(this.shield == 0){
            return true;
        }
        return false;
    };
    
    // updates the position of the enemy
    this.update = function(playerNode){
        this.updateX(playerNode);
        this.updateY(playerNode);
    };  
    this.updateX = function(playerNode){
        this.node.x(this.speedx, true);
    };
    this.updateY= function(playerNode){
        var newpos = parseInt(this.node.css("top"))+this.speedy;
        this.node.y(this.speedy, true);
    };
}

function Minion(node, shields, vertSpeed, horzSpeed, points, explode){
    this.node = $(node);
    this.shield = shields;
    this.speedx = -horzSpeed;
    this.speedy = vertSpeed;
    this.pointValue = points;
    this.explodeAnimation = explode;
}
Minion.prototype = new Enemy();
Minion.prototype.updateY = function(playerNode){
    
    if(this.node.y() > (PLAYGROUND_HEIGHT - 100)){
        this.node.y(-2, true)
    }
}

function Brainy(node, shields, vertSpeed, horzSpeed, points, explode){
    this.node = $(node);
    this.shield = shields;
    this.speedy = vertSpeed;
    this.speedx = -horzSpeed;
    this.pointValue = points;
    this.alignmentOffset = 5;
    this.explodeAnimation = explode;
}
Brainy.prototype = new Enemy();
Brainy.prototype.updateY = function(playerNode){
    if((this.node.y()+this.alignmentOffset) > $(playerNode).y()){
        this.node.y(-this.speedy, true);
    } else if((this.node.y()+this.alignmentOffset) < $(playerNode).y()){
        this.node.y(this.speedy, true);
    }
}

function Bossy(node, shields, vertSpeed, horzSpeed, points, explode){
    this.node = $(node);
    this.shield = shields;
    this.speedx = -horzSpeed;
    this.speedy = vertSpeed;
    this.pointValue = points;
    this.alignmentOffset = 35;
    this.explodeAnimation = explode;
}
Bossy.prototype = new Brainy();
Bossy.prototype.updateX = function(){
    if(this.node.x() > (PLAYGROUND_WIDTH - 200)){
        this.node.x(this.speedx, true)
    }
}

function getIntElement(element, childName)
{
    return getIntElement(element, childName, null);
}

function getIntElement(element, childName, defaultValue)
{
   var text = element.find(childName).text();
   text = text.trim();
   
   if ( !text )
       return defaultValue;
       
   return parseFloat(text);
}

function loadGeneral (){
    $.ajax({url: generalConfigURL,
                    success: function(data){
                      var queryString = ".general-info";
                      
                      $(data).find(queryString).each(function()
                      {
                        var element = $(this);
                        PLAYGROUND_HEIGHT = getIntElement(element, ".playground-height");
                        PLAYGROUND_WIDTH = getIntElement(element, ".playground-width");
                        
                        REFRESH_RATE = getIntElement(element, ".refresh-rate");
                        BACKGROUND_COLOR = element.find(".background-color").text().trim();
                        
                        $(element).find(".background-layer").each(function()
                            {
                                var backgroundLayer = new Object();
                                var bgElement = $(this);
                                backgroundLayer.speed = getIntElement(bgElement, ".layer-speed");
                                var url1 = bgElement.find(".background-image-1").attr("src");         
                                var url2 = bgElement.find(".background-image-2").attr("src");
                                
                                backgroundLayer.animation1 = new $.gameQuery.Animation({imageURL: url1});
                                backgroundLayer.animation2 = new $.gameQuery.Animation({imageURL: url2});
                                
                                backgroundLayers.push(backgroundLayer);
                            });
                      });
                    }, 
                    datatype: "html",
                    async: false});
}

function loadAnimation(node){
    return loadAnimation(node, false);
}

function loadAnimation(node, callback){
    var url = node.find(".sprite").attr("src");
    var type = node.find(".type").text().trim();
    var width = getIntElement(node, ".width");
    var height = getIntElement(node, ".height");
    var delta = null;
    
   var animation = null; 
   var frames = getIntElement(node, ".num-frames", 1);
   
    if ( type != "static" )
    {
        var animType = null;
        if ( type == "vertical" )
        {
            animType = $.gameQuery.ANIMATION_VERTICAL;
            delta = height / frames;
            height = height / frames;
        }
        else
        {
            animType = $.gameQuery.ANIMATION_HORIZONTAL;
            delta = width / frames;
            width = width / frames;
        }
        
        if ( callback )
            animType = animType | $.gameQuery.ANIMATION_CALLBACK;
            
        var rate = getIntElement(node, ".rate");
        
        animation = new $.gameQuery.Animation({imageURL: url, numberOfFrame: frames, delta: delta, rate: rate, type: animType});
    }
    else
        animation = new $.gameQuery.Animation({imageURL: url});
        
   animation.spriteHeight = height;
   animation.spriteWidth = width;
        
   return animation;
}

function loadPlayer (){
    $.ajax({url: playerConfigURL,
                    success: function(data){
                      var queryString = ".player-info";
                     
                        var element = $(data).find(queryString);
                        GRACE = getIntElement(element, ".grace-period");
                        PLAYER_LIVES = getIntElement(element, ".lives");
                        PLAYER_SHIELDS = getIntElement(element, ".shields");
                        
                        PLAYER_VERT_SPEED = getIntElement(element, ".vert-speed");
                        PLAYER_HORZ_SPEED = getIntElement(element, ".horz-speed");
                        
                        var idleAnimationNode = element.find(".idle-animation");
                        var idleAnimation = loadAnimation(idleAnimationNode, false);
                        
                        var explodeAnimationNode = element.find(".explode-animation");
                        var explodeAnimation = loadAnimation(explodeAnimationNode, false);
                        
                        var playerMissileAnimationNode = element.find(".player-missile");
                        var playerMissileAnimation = loadAnimation(playerMissileAnimationNode, false);
                        PLAYER_MISSILE_SPEED = getIntElement(playerMissileAnimationNode, ".missile-speed");
                        
                        var playerMissileExplodeAnimationNode = element.find(".player-missile-explode");
                        var playerMissileExplodeAnimation = loadAnimation(playerMissileExplodeAnimationNode, true);
                        
                        missile["player"] = playerMissileAnimation;
                        missile["playerexplode"] = playerMissileExplodeAnimation;
                        
                        playerAnimation["idle"] = idleAnimation;
                        playerAnimation["explode"]  = explodeAnimation;
                    }, 
                    datatype: "html",
                    async: false});
}

function loadEnemies()
{
 var result;
    $.ajax({url: enemiesConfigURL,
                    success: function(data){
                      var queryString = ".enemies-info";
                     
                        var element = $(data).find(queryString);
                        ENEMY_MISSILE_SPEED = getIntElement(element, ".missile-speed");
                        SPAWN_RATE = getIntElement(element, ".spawn-rate");
                        
                        var missileAnimationNode = element.find(".missile-animation");
                        var missileAnimation = loadAnimation(missileAnimationNode, false);
                        
                        var missileExplodeAnimationNode = element.find(".missile-explode-animation");
                        var missileExplodeAnimation = loadAnimation(missileExplodeAnimationNode, true);
                        
                        missile["enemies"] = missileAnimation;
                        missile["enemiesexplode"] = missileExplodeAnimation;
    
                        $(element).find(".enemy").each(function()
                        {
                            var enemyNode = $(this);
                            var enemyConfig = new Object();
                            enemyConfig.shields = getIntElement(enemyNode, ".shields");
                            enemyConfig.horzSpeed = getIntElement(enemyNode, ".horz-speed", 1);
                            enemyConfig.vertSpeed = getIntElement(enemyNode, ".vert-speed", 0);
                            enemyConfig.pointValue = getIntElement(enemyNode, ".point-value");
                            enemyConfig.prob = getIntElement(enemyNode, ".prob")/100;
                            enemyConfig.type = enemyNode.find(".ai-type").text().trim();
                            
                            var idleAnimationNode = enemyNode.find(".idle-animation");
                            var idleAnimation = loadAnimation(idleAnimationNode, false);
                            
                            var explodeAnimationNode = enemyNode.find(".explode-animation");
                            var explodeAnimation = loadAnimation(explodeAnimationNode, true);
                            
                            var enemyAnimArray = new Array();
                            enemyAnimArray["idle"] = idleAnimation;
                            enemyAnimArray["explode"] = explodeAnimation;
                            
                            enemies.push(enemyAnimArray);
                            enemyConfigs.push(enemyConfig);
                        });
                    }, 
                    datatype: "html",
                    async: false});
}

// --------------------------------------------------------------------------------------------------------------------
// --                                      the main declaration:                                                     --
// --------------------------------------------------------------------------------------------------------------------
$(function(){
    // Load configuration data
    loadGeneral();
    loadPlayer();
    loadEnemies();
    
    // Initialize the game:
    $("#playground").css("background-color", BACKGROUND_COLOR);
    $("#playground").playground({height: PLAYGROUND_HEIGHT, width: PLAYGROUND_WIDTH, keyTracker: true});
                
    // Initialize the background
    var playground = $.playground().addGroup("background", {width: PLAYGROUND_WIDTH, height: PLAYGROUND_HEIGHT});
    
    for ( var i = 0; i < backgroundLayers.length ; i ++ )
    {
        playground.addSprite("background"+i+"-1", {animation: backgroundLayers[i].animation1, width: PLAYGROUND_WIDTH, height: PLAYGROUND_HEIGHT})
                        .addSprite("background"+i+"-2", {animation: backgroundLayers[i].animation2, width: PLAYGROUND_WIDTH, height: PLAYGROUND_HEIGHT, posx: PLAYGROUND_WIDTH});
    }
    
   playground = playground.end();
    
   playground.addGroup("actors", {width: PLAYGROUND_WIDTH, height: PLAYGROUND_HEIGHT})
                        .addGroup("player", {posx: PLAYGROUND_WIDTH/2, posy: PLAYGROUND_HEIGHT/2, width: playerAnimation["idle"].spriteWidth, height: playerAnimation["idle"].spriteHeight})
                            .addSprite("playerBody",{animation: playerAnimation["idle"], posx: 0, posy: 0, width: playerAnimation["idle"].spriteWidth, height: playerAnimation["idle"].spriteHeight})
                        .end()
                    .end()
                    .addGroup("playerMissileLayer",{width: PLAYGROUND_WIDTH, height: PLAYGROUND_HEIGHT}).end()
                    .addGroup("enemiesMissileLayer",{width: PLAYGROUND_WIDTH, height: PLAYGROUND_HEIGHT}).end()
                    .addGroup("overlay",{width: PLAYGROUND_WIDTH, height: PLAYGROUND_HEIGHT});
   
   var playerObj = new Player($("#player"), PLAYER_LIVES, PLAYER_SHIELD);
   $("#player")[0].player = playerObj;
    
    
    //this is the HUD for the player life and shield
    $("#overlay").append("<div id='shieldHUD'style='color: white; width: 100px; position: absolute; font-family: verdana, sans-serif;'></div><div id='scoreHUD'style='color: white; width: 100px; position: absolute; right: 320px; font-family: verdana, sans-serif;'></div><div id='lifeHUD'style='color: white; width: 100px; position: absolute; right: 0px; font-family: verdana, sans-serif;'></div>")
    
    // this sets the id of the loading bar:
    $.loadCallback(function(percent){
        $("#loadingBar").width(400*percent);
    });
    
    //initialize the start button
    $("#startbutton").click(function(){
        $.playground().startGame(function(){
            $("#welcomeScreen").fadeTo(1000,0,function(){$(this).remove();});
        });
    })
    
    // this is the function that control most of the game logic 
    $.playground().registerCallback(function(){
        if(!gameOver){
            $("#shieldHUD").html("Shield: "+$("#player")[0].player.shield);
            $("#lifeHUD").html("Lives: "+$("#player")[0].player.replay);
            $("#scoreHUD").html("Score: " + $("#player")[0].player.score);
            //Update the movement of the ship:
            if(!playerHit){
                $("#player")[0].player.update();
                if(jQuery.gameQuery.keyTracker[65]){ //this is left! (a)
                    var nextpos = $("#player").x()-PLAYER_HORZ_SPEED;
                    if(nextpos > 0){
                        $("#player").x(nextpos);
                    }
                }
                if(jQuery.gameQuery.keyTracker[68]){ //this is right! (d)
                    var nextpos = $("#player").x()+PLAYER_HORZ_SPEED;
                    if(nextpos < PLAYGROUND_WIDTH - 100){
                        $("#player").x(nextpos);
                    }
                }
                if(jQuery.gameQuery.keyTracker[87]){ //this is up! (w)
                    var nextpos = $("#player").y()-PLAYER_VERT_SPEED;
                    if(nextpos > 0){
                        $("#player").y(nextpos);
                    }
                }
                if(jQuery.gameQuery.keyTracker[83]){ //this is down! (s)
                    var nextpos = $("#player").y()+PLAYER_VERT_SPEED;
                    if(nextpos < PLAYGROUND_HEIGHT - 30){
                        $("#player").y(nextpos);
                    }
                }
            } else {
                var posy = $("#player").y()+5;
                var posx = $("#player").x()-5;
                if(posy > PLAYGROUND_HEIGHT){
                    //Does the player did get out of the screen?
                    if($("#player")[0].player.respawn()){
                        gameOver = true;
                        $("#playground").append('<div style="position: absolute; top: 50px; width: 700px; color: white; font-family: verdana, sans-serif;"><center><h1>Game Over</h1><br><a style="cursor: pointer;" id="restartbutton">Click here to restart the game!</a></center></div>');
                        $("#restartbutton").click(restartgame);
                        $("#actors,#playerMissileLayer,#enemiesMissileLayer").fadeTo(1000,0);
                        $("#background").fadeTo(5000,0);
                        $("#shieldHUD").html("Shield: -");
                        $("#lifeHUD").html("Lives: -");
                    } else {
                        $("#explosion").remove();
                        $("#player").children().show();
                        $("#player").y(PLAYGROUND_HEIGHT / 2);
                        $("#player").x(PLAYGROUND_WIDTH / 2);
                        playerHit = false;
                    }
                } else {
                    $("#player").y(posy);
                    $("#player").x(posx);
                }
            }
            
            //Update the movement of the enemies
            $(".enemy").each(function(){
                    this.enemy.update($("#player"));
                    var posx = $(this).x();
                    if((posx + 100) < 0){
                        $(this).remove();
                        return;
                    }
                    //Test for collisions
                    var collided = $(this).collision("#playerBody,.group");
                    if(collided.length > 0){
                        $("#player")[0].player.tallyPoints($(this)[0].enemy);
                        $(this).setAnimation(this.enemy.explodeAnimation, function(node){$(node).remove();});
                        $(this).css("width", this.enemy.explodeAnimation.spriteWidth);
                        $(this).css("height", this.enemy.explodeAnimation.spriteHeight);

                        $(this).removeClass("enemy");
                        //The player has been hit!
                        if($("#player")[0].player.damage()){
                            explodePlayer($("#player"));
                        }
                    }
                    //Make the enemy fire
                    if(this.enemy instanceof Brainy){
                        if(Math.random() < 0.05){
                            var enemyposx = $(this).x();
                            var enemyposy = $(this).y();
                            var name = "enemiesMissile_"+Math.ceil(Math.random()*1000);
                            $("#enemiesMissileLayer").addSprite(name,{animation: missile["enemies"], posx: enemyposx, posy: enemyposy + 20, width: missile["enemies"].spriteWidth,height: missile["enemies"].spriteHeight});
                            $("#"+name).addClass("enemiesMissiles");
                        }
                    }
                });
            
            //Update the movement of the missiles
            $(".playerMissiles").each(function(){
                    var posx = $(this).x();
                    if(posx > PLAYGROUND_WIDTH){
                        $(this).remove();
                        return;
                    }
                    $(this).x(PLAYER_MISSILE_SPEED, true);
                    //Test for collisions
                    var collided = $(this).collision(".group,.enemy");
                    if(collided.length > 0){
                        //An enemy has been hit!
                        collided.each(function(){
                                if($(this)[0].enemy.damage()){
                                    $("#player")[0].player.tallyPoints($(this)[0].enemy);
                                    $(this).setAnimation($(this)[0].enemy.explodeAnimation, function(node){$(node).remove();});
                                    $(this).css("width", $(this)[0].enemy.explodeAnimation.spriteWidth);
                                    $(this).css("height", $(this)[0].enemy.explodeAnimation.spriteHeight);
                                    $(this).removeClass("enemy");
                                }
                            })
                        $(this).setAnimation(missile["playerexplode"], function(node){$(node).remove();});
                        $(this).css("width", missile["playerexplode"].spriteWidth);
                        $(this).css("height", missile["playerexplode"].spriteHeight);
                        $(this).y(-7, true);
                        $(this).removeClass("playerMissiles");
                    }
                });
            $(".enemiesMissiles").each(function(){
                    var posx = $(this).x();
                    if(posx < 0){
                        $(this).remove();
                        return;
                    }
                    $(this).x(-ENEMY_MISSILE_SPEED, true);
                    //Test for collisions
                    var collided = $(this).collision(".group,#playerBody");
                    if(collided.length > 0){
                        //The player has been hit!
                        collided.each(function(){
                                if($("#player")[0].player.damage()){
                                    explodePlayer($("#player"));
                                }
                            })
                        //$(this).remove();
                        $(this).setAnimation(missile["enemiesexplode"], function(node){$(node).remove();});
                        $(this).css("width", missile["enemiesexplode"].spriteWidth);
                        $(this).css("height", missile["enemiesexplode"].spriteHeight);
                        $(this).removeClass("enemiesMissiles");
                    }
                });
        }
    }, REFRESH_RATE);
    
    //This function manage the creation of the enemies
    $.playground().registerCallback(function(){
        if(!bossMode && !gameOver){
            var name =  "enemy1_"+Math.ceil(Math.random()*1000);
            
            for ( var i = 0; i < enemyConfigs.length ; i++ )
            {
                var random = Math.random();
                if ( random < enemyConfigs[i].prob ) 
                {
                    var enemy;
                    $("#actors").addSprite(name, {animation: enemies[i]["idle"], posx: PLAYGROUND_WIDTH, posy: Math.random()*PLAYGROUND_HEIGHT, width: enemies[i]["idle"].spriteWidth, height: enemies[i]["idle"].spriteHeight});
                    $("#"+name).addClass("enemy");
                    
                    if ( enemyConfigs[i].type == "minion")
                    {
                        enemy = new Minion($("#"+name), enemyConfigs[i].shields, enemyConfigs[i].vertSpeed, enemyConfigs[i].horzSpeed, enemyConfigs[i].pointValue, enemies[i]["explode"]);
                    }
                    else if ( enemyConfigs[i].type == "brainy")
                    {
                        enemy = new Brainy($("#"+name), enemyConfigs[i].shields, enemyConfigs[i].vertSpeed, enemyConfigs[i].horzSpeed, enemyConfigs[i].pointValue, enemies[i]["explode"]);
                    }
                    else
                    {
                        bossMode = true;
                        bossName = name;
                        enemy = new Bossy($("#"+name), enemyConfigs[i].shields, enemyConfigs[i].vertSpeed, enemyConfigs[i].horzSpeed, enemyConfigs[i].pointValue, enemies[i]["explode"]);
                    }
                    
                    $("#"+name)[0].enemy = enemy;
                    break;
                }
            }
        } else {
            if($("#"+bossName).length == 0){
                bossMode = false;
            }
        }
        
    }, SPAWN_RATE); 
    
    
    //This is for the background animation
    $.playground().registerCallback(function(){
    
        for ( var i = 0; i < backgroundLayers.length ; i ++ )
        {
            var bgSpriteName = "#background"+i+"-1";
            var bgElement = $(bgSpriteName);
            var newPos =  (bgElement.x() - backgroundLayers[i].speed - PLAYGROUND_WIDTH) % (-2 * PLAYGROUND_WIDTH) + PLAYGROUND_WIDTH;
            $(bgSpriteName).x(newPos);
            
            bgSpriteName = "#background"+i+"-2";
            
            bgElement = $(bgSpriteName);
            newPos = (bgElement.x() - backgroundLayers[i].speed - PLAYGROUND_WIDTH) % (-2 * PLAYGROUND_WIDTH) + PLAYGROUND_WIDTH;
            $(bgSpriteName).x(newPos);
        }      
    }, REFRESH_RATE);
    
    //this is where the keybinding occurs
    $(document).keydown(function(e){
        if(!gameOver && !playerHit){
            switch(e.keyCode){
                case 75: //this is shoot (k)
                    //shoot missile here
                    var playerposx = $("#player").x();
                    var playerposy = $("#player").y();
                    var name = "playerMissle_"+Math.ceil(Math.random()*1000);
                    $("#playerMissileLayer").addSprite(name,{animation: missile["player"], posx: playerposx + playerAnimation["idle"].spriteWidth/2 + 10, posy: playerposy + 14, width: missile["player"].spriteWidth ,height: missile["player"].spriteHeight});
                    $("#"+name).addClass("playerMissiles")
                    break;
            }
        }
    });
});