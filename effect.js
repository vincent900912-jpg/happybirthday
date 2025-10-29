$(window).load(function(){
    // 初始先只顯示 intro，不顯示主容器
    $('.container').hide();
});
$(document).ready(function(){
		var vw;
		$(window).resize(function(){
			 vw = $(window).width()/2;
			$('#b1,#b2,#b3,#b4,#b5,#b6,#b7').stop();
			$('#b1').animate({top:240, left: vw-300},500);
			$('#b2').animate({top:240, left: vw-200},500);
			$('#b3').animate({top:240, left: vw-100},500);
			$('#b4').animate({top:240, left: vw},500);
			$('#b5').animate({top:240, left: vw+100},500);
			$('#b6').animate({top:240, left: vw+200},500);
			$('#b7').animate({top:240, left: vw+300},500);
		});

    // 初始隱藏開燈按鈕，待用戶滑過導引區塊後才出現
    $('#turn_on').hide();

    // 音樂切換：預載彩蛋歌曲並建立切換工具
    window.BG_AUDIO = document.querySelector('.song');
    window.EGG_AUDIO = new Audio('soulmate.mp3');
    var BG_AUDIO = window.BG_AUDIO;
    var EGG_AUDIO = window.EGG_AUDIO;
    EGG_AUDIO.loop = true;
    EGG_AUDIO.preload = 'auto';
    EGG_AUDIO.volume = 0;
    window.CURRENT_MUSIC = 'main'; // 'main' 或 'egg'
    var CURRENT_MUSIC = window.CURRENT_MUSIC;

    function ensureEggPreload(){
        try { EGG_AUDIO.load(); } catch(e){}
    }
    window.USER_VOLUME = 1; // 使用者設定音量（0~1）
    var USER_VOLUME = window.USER_VOLUME;
    function crossfade(from, to, duration){
        duration = duration || 360;
        var steps = 12;
        var stepTime = Math.max(16, Math.floor(duration/steps));
        var delta = 1/steps;
        var targetVol = USER_VOLUME; // 目標音量遵循使用者設定
        // 先確保目標音訊開始播放
        try { to.play(); } catch(e){}
        var timer = setInterval(function(){
            var vFrom = Math.max(0, (from.volume||targetVol) - delta);
            var vTo = Math.min(targetVol, (to.volume||0) + delta);
            from.volume = vFrom;
            to.volume = vTo;
            if (vFrom <= 0 && Math.abs(vTo - targetVol) < 0.001){
                clearInterval(timer);
                // 降到 0 後暫停來源，避免重疊
                try { from.pause(); } catch(e){}
            }
        }, stepTime);
    }
    function switchToEggAudio(){
        ensureEggPreload();
        if (BG_AUDIO) { crossfade(BG_AUDIO, EGG_AUDIO, 360); }
        else { try { EGG_AUDIO.play(); } catch(e){} }
        window.CURRENT_MUSIC = 'egg';
        updateMusicUIForActive();
    }
    function switchToMainAudio(){
        if (BG_AUDIO){
            // 讓主音樂即刻開始（若已被暫停），並交叉淡回
            try { BG_AUDIO.play(); } catch(e){}
            crossfade(EGG_AUDIO, BG_AUDIO, 360);
        } else {
            try { EGG_AUDIO.pause(); } catch(e){}
        }
        window.CURRENT_MUSIC = 'main';
        updateMusicUIForActive();
    }

    // 音樂切換按鈕：建立與綁定
    var MUSIC_TOGGLE_INIT = false;
    function ensureMusicToggleUI(){
        if (!document.getElementById('music-toggle')){
            var $toggle = $('<div id="music-toggle" class="music-toggle" style="display:none; position: fixed; right: 12px; bottom: 12px; z-index: 2147483647; text-align: center;">'+
                            '<div class="music-controls mc-top">'+
                              '<input id="mc-seek" class="mc-seek" type="range" min="0" max="100" value="0" step="0.01" />'+
                            '</div>'+
                            '<div class="music-controls mc-bottom">'+
                               '<button id="mc-play" class="music-btn mc-play" type="button">播放/暫停</button>'+
                               '<button id="music-switch" class="music-btn" type="button">切換音樂</button>'+
                             '</div>'+
                             '<div id="mc-time" class="mc-time">00:00 / 00:00</div>'+
                             '<div class="music-caption">背景音樂控制區</div>'+
                             '</div>');
            $('body').append($toggle);
        }
        if (!MUSIC_TOGGLE_INIT){
            // 播放/暫停
            $('#mc-play').off('click').on('click', function(){
                var a = getActiveAudio();
                if (!a) return;
                if (a.paused) { try { a.play(); } catch(e){} } else { try { a.pause(); } catch(e){} }
                syncPlayButton();
            });
            // 切換音樂：主曲 <-> 彩蛋
            $('#music-switch').off('click').on('click', function(){
                if (window.CURRENT_MUSIC === 'egg'){
                    switchToMainAudio();
                } else {
                    switchToEggAudio();
                }
                updateMusicUIForActive();
            });
            // 進度拖動（秒）
            $('#mc-seek').off('input change').on('input change', function(){
                var a = getActiveAudio();
                if (!a || !isFinite(a.duration)) return;
                var target = Math.max(0, Math.min(a.duration, parseFloat(this.value||'0')));
                try { a.currentTime = target; } catch(e){}
            });

            // 綁定時間更新與中繼事件
            bindAudioEvents(BG_AUDIO);
            bindAudioEvents(EGG_AUDIO);

            MUSIC_TOGGLE_INIT = true;
        }
    }
    var MUSIC_TOGGLE_SHOWN = false;
    function showMusicToggle(){
        ensureMusicToggleUI();
        var $mt = $('#music-toggle');
        if (!$mt.length) return;
        if (!MUSIC_TOGGLE_SHOWN){
            // 先確保 display 為 block，再以透明度動畫顯示，避免不同瀏覽器對 fadeIn 的差異
            $mt.css('display','block').css('opacity',0).animate({opacity:1}, 240);
            MUSIC_TOGGLE_SHOWN = true;
            // 初始化 UI 狀態
            updateMusicUIForActive();
        }
    }

    function enterMain(){
        if (!$('#intro').is(':visible')) return;
        
        // 先準備主容器但不顯示
        $('.container').show().removeClass('show');
        
        // 絲滑轉場：導引區淡出 + 模糊，上移；主容器淡入回彈
        var $intro = $('#intro');
        $intro.addClass('fade-out');
        setTimeout(function(){
            $intro.hide();
            $('.container').show();
            // 讓 CSS 過渡有機會生效
            requestAnimationFrame(function(){
                $('.main-stage').addClass('show');
                setTimeout(function(){ $('#turn_on').fadeIn(500); }, 250);
            });
        }, 700);
    }

    function checkScrollTrigger(){
        // 任何滑動動作都觸發進入主內容
        enterMain();
    }

    // 監聽各種滑動動作：滾輪、觸控、鍵盤
    $(window).on('wheel DOMMouseScroll', function(e){
        e.preventDefault(); // 阻止實際滾動
        checkScrollTrigger();
    });
    
    $('#intro').on('touchstart touchmove', function(e){
        e.preventDefault(); // 阻止實際滾動
        checkScrollTrigger();
    });
    
    $('#intro').on('click', enterMain);
    
    $(document).on('keydown', function(e){
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'PageDown') {
            e.preventDefault();
            enterMain();
        }
    });

	$('#turn_on').click(function(){
		$('#bulb_yellow').addClass('bulb-glow-yellow');
		$('#bulb_red').addClass('bulb-glow-red');
		$('#bulb_blue').addClass('bulb-glow-blue');
		$('#bulb_green').addClass('bulb-glow-green');
		$('#bulb_pink').addClass('bulb-glow-pink');
		$('#bulb_orange').addClass('bulb-glow-orange');
		$('body').addClass('peach');
		$(this).fadeOut('slow').delay(3000).promise().done(function(){
			$('#play').fadeIn('slow');
		});
	});
	$('#play').click(function(){
        var audio = $('.song')[0];
        audio.play();
        ensureEggPreload(); // 預先載入彩蛋音樂，避免稍後切換延遲
        // 保持規則：控制區僅在彩蛋提示框首次出現後顯示（不在此顯示）
        $('#bulb_yellow').addClass('bulb-glow-yellow-after');
		$('#bulb_red').addClass('bulb-glow-red-after');
		$('#bulb_blue').addClass('bulb-glow-blue-after');
		$('#bulb_green').addClass('bulb-glow-green-after');
		$('#bulb_pink').addClass('bulb-glow-pink-after');
		$('#bulb_orange').addClass('bulb-glow-orange-after');
		$('body').css('backgroud-color','#FFF');
		$('body').addClass('peach-after');
		$(this).fadeOut('slow').delay(3000).promise().done(function(){
			$('#bannar_coming').fadeIn('slow');
		});
	});

	$('#bannar_coming').click(function(){
		$('.bannar').addClass('bannar-come');
		$(this).fadeOut('slow').delay(3000).promise().done(function(){
			$('#balloons_flying').fadeIn('slow');
		});
	});

	function loopOne() {
		var randleft = 1000*Math.random();
		var randtop = 500*Math.random();
		$('#b1').animate({left:randleft,bottom:randtop},10000,function(){
			loopOne();
		});
	}
	function loopTwo() {
		var randleft = 1000*Math.random();
		var randtop = 500*Math.random();
		$('#b2').animate({left:randleft,bottom:randtop},10000,function(){
			loopTwo();
		});
	}
	function loopThree() {
		var randleft = 1000*Math.random();
		var randtop = 500*Math.random();
		$('#b3').animate({left:randleft,bottom:randtop},10000,function(){
			loopThree();
		});
	}
	function loopFour() {
		var randleft = 1000*Math.random();
		var randtop = 500*Math.random();
		$('#b4').animate({left:randleft,bottom:randtop},10000,function(){
			loopFour();
		});
	}
	function loopFive() {
		var randleft = 1000*Math.random();
		var randtop = 500*Math.random();
		$('#b5').animate({left:randleft,bottom:randtop},10000,function(){
			loopFive();
		});
	}

	function loopSix() {
		var randleft = 1000*Math.random();
		var randtop = 500*Math.random();
		$('#b6').animate({left:randleft,bottom:randtop},10000,function(){
			loopSix();
		});
	}
	function loopSeven() {
		var randleft = 1000*Math.random();
		var randtop = 500*Math.random();
		$('#b7').animate({left:randleft,bottom:randtop},10000,function(){
			loopSeven();
		});
	}

	$('#balloons_flying').click(function(){
		$('.balloon-border').animate({top:-500},8000);
		$('#b1,#b4,#b5,#b7').addClass('balloons-rotate-behaviour-one');
		$('#b2,#b3,#b6').addClass('balloons-rotate-behaviour-two');
		// $('#b3').addClass('balloons-rotate-behaviour-two');
		// $('#b4').addClass('balloons-rotate-behaviour-one');
		// $('#b5').addClass('balloons-rotate-behaviour-one');
		// $('#b6').addClass('balloons-rotate-behaviour-two');
		// $('#b7').addClass('balloons-rotate-behaviour-one');
		loopOne();
		loopTwo();
		loopThree();
		loopFour();
		loopFive();
		loopSix();
		loopSeven();
		
		$(this).fadeOut('slow').delay(3000).promise().done(function(){
			$('#cake_fadein').fadeIn('slow');
		});
	});

    $('#cake_fadein').click(function(){
        $('.cake-cover').fadeIn('slow');
        // 顯示蛋糕並強制設定垂直位置（內聯樣式以確保覆蓋任何 CSS）
        $('.cake').fadeIn('slow', function(){
            $('.cake').css('top', 'calc(75% + 80px)');
            // 確保右側 cutebirdhb 先顯示再定位（避免 display: none 導致量測為 0）
            $('#cutebirdhb').css('display','block');
            placeCutehb();
            placeCutebirdhb();
        });
        $(this).fadeOut('slow').delay(3000).promise().done(function(){
            $('#light_candle').fadeIn('slow');
        });
    });

	$('#light_candle').click(function(){
		$('.fuego').fadeIn('slow');
		$(this).fadeOut('slow').promise().done(function(){
			$('#wish_message').fadeIn('slow');
		});
	});

		
	$('#wish_message').click(function(){
		 vw = $(window).width()/2;

		$('#b1,#b2,#b3,#b4,#b5,#b6,#b7').stop();
		$('#b1').attr('id','b11');
		$('#b2').attr('id','b22')
		$('#b3').attr('id','b33')
		$('#b4').attr('id','b44')
		$('#b5').attr('id','b55')
		$('#b6').attr('id','b66')
		$('#b7').attr('id','b77')
		$('#b11').animate({top:240, left: vw-350},500);
		$('#b22').animate({top:240, left: vw-250},500);
		$('#b33').animate({top:240, left: vw-150},500);
		$('#b44').animate({top:240, left: vw-50},500);
		$('#b55').animate({top:240, left: vw+50},500);
		$('#b66').animate({top:240, left: vw+150},500);
		$('#b77').animate({top:240, left: vw+250},500);
		$('.balloons').css('opacity','0.9');
		$('.balloons h2').fadeIn(3000);
		$(this).fadeOut('slow').delay(3000).promise().done(function(){
			$('#story').fadeIn('slow');
		});
	});
	
	$('#story').click(function(){
		$(this).fadeOut('slow');
		// 訊息出現時，蛋糕與兩張側邊圖一同隱藏
		$('#cutehb, #cutebirdhb').stop(true, true).fadeOut('fast');
		$('.cake').fadeOut('fast').promise().done(function(){
            $('.message').fadeIn('slow', function(){
                var $container = $('.row.message .col-md-12');
                var $ps = $container.find('p');
                var texts = $ps.map(function(){ return $(this).text(); }).get();
                // 初始化：隱藏並清空，以便逐字打出
                $ps.hide().text('');

                var typeSpeed = 150;   // 每字毫秒（更慢）
                var holdDelay = 2000;  // 完成後停留時間（改為2秒）

                function typeLine(i){
                    if (i >= texts.length) { return; }
                    var $p = $ps.eq(i);
                    var text = texts[i];
                    $p.show();
                    var chars = Array.from(text);
                    var idx = 0;
                    var timer = setInterval(function(){
                        $p.text($p.text() + chars[idx]);
                        idx++;
                        if (idx >= chars.length) {
                            clearInterval(timer);
                            setTimeout(function(){
                                $p.fadeOut('slow', function(){
                                    if (i === texts.length - 1) {
                                        // 最後一句結束：恢復蛋糕與側邊圖，並顯示彩蛋
                                        $('.cake').fadeIn('fast');
                                        $('.cake').css('top', 'calc(75% + 80px)');
                                        $('#cutehb, #cutebirdhb').fadeIn('fast');
                                        setTimeout(function(){
                                            placeCutehb();
                                            placeCutebirdhb();
                                        }, 80);
                                        setTimeout(function(){
                                            showEasterEgg();
                                        }, 1000);
                                    } else {
                                        typeLine(i+1);
                                    }
                                });
                            }, holdDelay);
                        }
                    }, typeSpeed);
                }

                typeLine(0);
            });
        });
        
    });
	
	// 彩蛋功能
    function showEasterEgg() {
        // 顯示彩蛋容器
        $('#easter-egg-container').fadeIn(600);
        // 將容器移到 body，避免父層建立的堆疊或變形影響顯示
        var $eggContainer = $('#easter-egg-container');
        if (!$eggContainer.parent().is('body')) {
            $eggContainer.appendTo('body');
        }

        // 初始化狀態：步驟索引與座標集
        var currentStep = 0; // 0 對應位置 1
        var steps = computeEggPositions();
        var initialTarget = steps[currentStep];
        // 設定初始位置到「位置1：右下角」
        $('#easter-egg-container').css({ left: initialTarget.left + 'px', top: initialTarget.top + 'px' });

        // 安全邊距與座標計算函數（根據視窗大小動態調整）
        function computeEggPositions() {
            var ww = $(window).width();
            var wh = $(window).height();
            var ew = $('#easter-egg').outerWidth();
            var eh = $('#easter-egg').outerHeight();
            var m = 30; // 安全邊距
            var clamp = function(v, min, max){ return Math.max(min, Math.min(v, max)); };

            return [
                // 1：右下角
                { left: ww - ew - m, top: wh - eh - m },
                // 2：左上角
                { left: m, top: m },
                // 3：底部中央
                { left: clamp((ww - ew)/2, m, ww - ew - m), top: wh - eh - m },
                // 4：右上角
                { left: ww - ew - m, top: m },
                // 5：左下角（終點）
                { left: m, top: wh - eh - m }
            ];
        }

        // 點擊後依序瞬移到 2→3→4→5；第5次只改文字不移動
        $('#easter-egg').off('click').on('click', function(){
            // 點擊次數對應的文字
            var messages = [
                null, // 初始不改
                '哎呀~差點就抓到我了',
                '又被我逃掉了~ 嘻嘻',
                '就差一點了',
                '被抓到了(⁰⊖⁰)' // 進入位置5時顯示
            ];

            if (currentStep < 4) {
                // 進入下一步並瞬移
                currentStep += 1;
                steps = computeEggPositions();
                var target = steps[currentStep];
                $('.easter-egg-text').text(messages[currentStep] || $('.easter-egg-text').text());
                $('#easter-egg-container').css({ left: target.left + 'px', top: target.top + 'px' });
            } else {
                // 位置5：保持文字，並打開提示框
                $('.easter-egg-text').text('被抓到了(⁰⊖⁰)');
                openEggPrompt();
            }
        });

        // 視窗大小變更時，保持當前步驟位置
        $(window).off('resize.easter').on('resize.easter', function(){
            steps = computeEggPositions();
            var target = steps[currentStep];
            $('#easter-egg-container').css({ left: target.left + 'px', top: target.top + 'px' });
        });
    }

    // 建立並開啟彩蛋提示框
    function openEggPrompt() {
        // 動態建立 DOM（若尚未建立）
        if (!$('#egg-modal').length){
            var $overlay = $('<div id="egg-modal-overlay" class="egg-modal-overlay" />');
            var $modal = $('<div id="egg-modal" class="egg-modal" />');
            // 三區：頂部（按鈕）、中間（內容/圖片）、底部（文字/輸入）
            var $header = $('<div class="egg-header" />');
            var $close = $('<button id="egg-close" class="egg-close" aria-label="關閉">×</button>');
            var $back = $('<button id="egg-back" class="egg-back" aria-label="返回">返回</button>');
            $header.append($back, $close);

            var $content = $('<div id="egg-content" class="egg-content" />');
            var $img = $('<img id="egg-msg-img" class="egg-msg-img" alt="" style="display:none;" />');
            $content.append($img);

            var $footer = $('<div class="egg-footer" />');
            var $text = $('<div class="egg-prompt-text">豚骨泡麵必須加什麼果汁才好吃?</div>');
            var $input = $('<input id="egg-input" class="egg-input" type="text" autocomplete="off" />');
            var $submit = $('<button id="egg-submit" class="egg-submit">提交</button>');
            var $msg = $('<div id="egg-msg" class="egg-msg"></div>');
            $footer.append($text, $input, $submit, $msg);

            $modal.append($header, $content, $footer);
            $('body').append($overlay, $modal);
        }
        // 確保在 body 最後，取得最高堆疊優先
        $('#egg-modal-overlay, #egg-modal').appendTo('body');
        // 綁定關閉、返回與提交
        $('#egg-close, #egg-modal-overlay').off('click').on('click', closeEggPrompt);
        $('#egg-back').off('click').on('click', handleEggBack);
        $('#egg-submit').off('click').on('click', handleEggSubmit);
        $('#egg-input').off('keydown').on('keydown', function(e){ if(e.key==='Enter'){ handleEggSubmit(); }});
        // 顯示與過渡
        var $overlay = $('#egg-modal-overlay');
        var $modal = $('#egg-modal');
        $overlay.show();
        $modal.show();
        requestAnimationFrame(function(){
            $overlay.addClass('show');
            $modal.addClass('show');
        });
        // 初始狀態
        $('#egg-input').val('').css('opacity', 1).show().focus();
        $('#egg-msg').hide().text('').removeClass('success error wink');
        $('#egg-msg-img').hide().attr('src','');
        // 確保每次開啟都還原內容可見
        $('.egg-prompt-text, .egg-submit').show().css('opacity', 1);
        $('#egg-back').show();

        // 開啟提示框時，交叉淡入切換為 soulmate.mp3
        switchToEggAudio();
        // 第一次開啟後才顯示音樂切換按鈕
        showMusicToggle();
    }

    function closeEggPrompt(){
        var $overlay = $('#egg-modal-overlay');
        var $modal = $('#egg-modal');
        $overlay.removeClass('show');
        $modal.removeClass('show');
        setTimeout(function(){ 
            $overlay.hide(); 
            $modal.hide(); 
            // 關閉提示框時，交叉淡回原本的背景音樂
            switchToMainAudio();
            // 保證首次開啟後就能看到控制列（即使在關閉彈窗時）
            showMusicToggle();
        }, 280);
    }

    function handleEggSubmit(){
        var raw = ($('#egg-input').val()||'');
        // 規範輸入：去除所有空白、全形半形一致化
        var val = raw.replace(/\s+/g,'').trim();
        var disp = raw.trim();
        var msg = '';
        var type = '';
        var imgSrc = '';

        // 驗證答案（三種皆可，大小寫不敏感）
        var normalized = val.toLowerCase();
        var isAnswer = (normalized === '芭樂汁' || normalized === '芭樂' || normalized === '芭辣汁');
        var isWu = (normalized === '吳宗樺' || normalized === '吴宗桦' || normalized === '吳宗桦' || normalized === '吴宗樺');
        var isXu = (normalized === '徐羿妤');
        var isKapi = (normalized === '卡皮' || normalized === '卡皮巴拉' || normalized === '卡皮芭拉' || normalized === '卡皮八拉' || normalized === '卡皮叭拉' || normalized === '卡皮吧拉');

        // 空白內容
        if (!val) {
            msg = '不可以繳白卷啦😵‍💫';
            type = 'error';
            imgSrc = 'cat.jpg';
        } else if (isAnswer) {
            msg = '本券一經送出不可退貨 並且無需使用即可被動觸發\n嘻嘻😼';
            type = 'success';
            imgSrc = 'dinner.png';
        } else if (isWu) {
            msg = '嘻嘻 我就知道妳會打我的名字 我預判妳的預判😎';
            type = 'wink';
            imgSrc = 'Prediction.gif';
        } else if (isXu) {
            msg = '確定要加自己嗎?也不是不行🥴';
            type = 'wink';
            imgSrc = 'clams.jpg';
        } else if (isKapi) {
            msg = '卡皮還在尋找自己的鼻子...🤡';
            type = 'wink';
            imgSrc = 'nose.jpg';
        } else {
            // 錯誤答案：隨機輪播五種提示，不重複直到全部出現一次
            if (!window.EGG_ERROR_POOL) {
                window.EGG_ERROR_POOL = [
                    { key: 'sparrow', img: 'sparrow.jpg', text: function(v){ return '確定是' + v + '嗎? 應該不是餒🤔'; } },
                    { key: 'pandaman', img: 'pandaman.gif', text: function(v){ return '加' + v + '有點邪教欸 再想想看🥸'; } },
                    { key: 'dog1', img: 'dog1.jpg', text: function(v){ return '唉呦~加' + v + '感覺也不錯欸 這麼好吃的美食就交給妳幫我試吃了😼'; } },
                    { key: 'chinesewords', img: 'Chinesewords.jpg', text: function(v){ return '錯錯錯 罰妳把上面的字唸一遍🤣'; } },
                    { key: 'handsome', img: 'handsome.jpg', text: function(v){ return '雖然答案不對 但突然想放張自己的照片😎'; } }
                ];
            }
            function shuffle(arr){
                var a = arr.slice();
                for (var i=a.length-1; i>0; i--){
                    var j = Math.floor(Math.random()*(i+1));
                    var t = a[i]; a[i] = a[j]; a[j] = t;
                }
                return a;
            }
            if (!window.EGG_ERROR_ORDER || !Array.isArray(window.EGG_ERROR_ORDER) || window.EGG_ERROR_INDEX >= window.EGG_ERROR_ORDER.length){
                var lastKey = window.EGG_ERROR_LAST_KEY || null;
                var order = shuffle(window.EGG_ERROR_POOL);
                if (order.length && lastKey && order[0].key === lastKey){
                    for (var k=1;k<order.length;k++){
                        if (order[k].key !== lastKey){ var tmp = order[0]; order[0] = order[k]; order[k] = tmp; break; }
                    }
                }
                window.EGG_ERROR_ORDER = order;
                window.EGG_ERROR_INDEX = 0;
            }
            var def = window.EGG_ERROR_ORDER[window.EGG_ERROR_INDEX++];
            if (def && def.key === window.EGG_ERROR_LAST_KEY){
                // 連續保險：若恰好相同，取下一個
                def = window.EGG_ERROR_ORDER[window.EGG_ERROR_INDEX++ % window.EGG_ERROR_ORDER.length];
            }
            window.EGG_ERROR_LAST_KEY = def ? def.key : null;
            msg = def ? def.text(disp || val || '') : '錯錯錯';
            type = 'error';
            imgSrc = def ? def.img : '';
        }
        var $modal = $('#egg-modal');
        var $msg = $('#egg-msg');
        var $img = $('#egg-msg-img');
        var $footer = $('.egg-footer');
        // 只淡出底部的提示/輸入/提交，不影響頂部與中間容器
        var $toClear = $footer.children().not($msg);
        $msg.stop(true,true).hide();
        $img.stop(true,true).hide();
        $('#egg-input').val('');
        $toClear.stop(true,true).fadeOut(200, function(){
            $toClear.hide().css('opacity',1);
        });
        setTimeout(function(){
            // 圖片顯示（若有）
            if (imgSrc){
                $img.attr('src', imgSrc).css({display:'block', opacity:0}).animate({opacity:1}, 240);
            } else {
                $img.hide().attr('src','');
            }
            var safeHtml = (msg||'')
                .replace(/[&<>"']/g, function(ch){
                    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch];
                })
                .replace(/\n/g,'<br>');
            $msg
                .stop(true,true)
                .html(safeHtml)
                .removeClass('success error wink')
                .addClass(type)
                .css({display:'block', opacity:0})
                .animate({opacity:1}, 240);
        }, 210);
    }

    function handleEggBack() {
        const promptText = document.querySelector('.egg-prompt-text');
        const inputEl = document.querySelector('.egg-input');
        const submitBtn = document.querySelector('.egg-submit');
        const msgEl = document.querySelector('.egg-msg');
        const imgEl = document.querySelector('#egg-msg-img');

        // 淡出訊息，淡入輸入欄位，並完整重置訊息樣式避免殘留
        if (msgEl) {
          msgEl.style.transition = '';
          msgEl.style.opacity = '0';
          if (imgEl){ imgEl.style.transition = ''; imgEl.style.opacity = '0'; }
          setTimeout(() => {
            if (imgEl){ imgEl.style.display = 'none'; imgEl.setAttribute('src',''); imgEl.style.opacity = ''; }
            msgEl.style.display = 'none';
            msgEl.style.opacity = '';
            msgEl.textContent = '';
            msgEl.classList.remove('success','error','wink');
            if (promptText && inputEl && submitBtn) {
              promptText.style.display = 'block';
              inputEl.style.display = 'block';
              submitBtn.style.display = 'block';
              promptText.style.transition = inputEl.style.transition = submitBtn.style.transition = 'opacity .25s ease';
              promptText.style.opacity = '0';
              inputEl.style.opacity = '0';
              submitBtn.style.opacity = '0';
              setTimeout(() => {
                promptText.style.opacity = '1';
                inputEl.style.opacity = '1';
                submitBtn.style.opacity = '1';
              }, 0);
            }
          }, 250);
        }
      }

    // 預先建立音樂控制列（隱藏），避免顯示時機錯過
    ensureMusicToggleUI();
    // 將 cutehb 圖片放到蛋糕左側紅圈位置（改用 viewport 位置計算）
    function placeCutehb() {
        var $cake = $('.cake');
        var $img = $('#cutehb');
        if (!$cake.length || !$img.length) return;
        // 移到 body，避免祖先 transform 影響 fixed 定位
        if (!$img.parent().is('body')) { $img.appendTo('body'); }
        $img.css({ display: 'block', width: '180px', opacity: 1, visibility: 'visible' });
        var rect = $cake[0].getBoundingClientRect();
        var imgW = 180;
        var imgH = $img.outerHeight() || ($img[0] && $img[0].naturalHeight) || 120;
        var gap = 60; // 原120 -> 60，讓左圖更靠近蛋糕
        var left = rect.left - imgW - gap;
        var top = rect.bottom - imgH + 20;
        var ww = $(window).width();
        var wh = $(window).height();
        var m = 8;
        left = Math.max(m, Math.min(ww - imgW - m, left));
        top = Math.max(m, Math.min(wh - imgH - m, top));
        $img.css({ left: left + 'px', top: top + 'px' });
        $(window).off('resize.cutehb').on('resize.cutehb', function(){ placeCutehb(); });
    }

    // 將 cutebirdhb 放到蛋糕右側（改用 viewport 位置計算）
    function placeCutebirdhb() {
        var $cake = $('.cake');
        var $img = $('#cutebirdhb');
        if (!$cake.length || !$img.length) return;
        // 移到 body，避免祖先 transform 影響 fixed 定位
        if (!$img.parent().is('body')) { $img.appendTo('body'); }
        function positionNow(){
            $img.css({ display: 'block', width: '180px', opacity: 1, visibility: 'visible' });
            var rect = $cake[0].getBoundingClientRect();
            var imgW = 180;
            var imgH = $img.outerHeight() || ($img[0] && $img[0].naturalHeight) || 120;
            var gap = 60; // 原80 -> 60，讓右圖更靠近蛋糕
            var left = rect.right + gap;
            var top = rect.bottom - imgH + 20;
            var ww = $(window).width();
            var wh = $(window).height();
            var m = 8;
            left = Math.max(m, Math.min(ww - imgW - m, left));
            top = Math.max(m, Math.min(wh - imgH - m, top));
            $img.css({ left: left + 'px', top: top + 'px' });
        }
        if ($img[0] && !$img[0].complete) { $img.one('load', positionNow); }
        positionNow();
        $(window).off('resize.cutebirdhb').on('resize.cutebirdhb', function(){ positionNow(); });
    }
});




function getActiveAudio(){
    return (window.CURRENT_MUSIC === 'egg') ? window.EGG_AUDIO : window.BG_AUDIO;
}
function formatTime(s){
    if (!isFinite(s) || s < 0) return '00:00';
    var m = Math.floor(s/60), sec = Math.floor(s%60);
    return (m<10?'0':'')+m+':' + (sec<10?'0':'')+sec;
}
function syncPlayButton(){
    var btn = document.getElementById('mc-play');
    if (btn) btn.textContent = '播放/暫停';
}
function updateMusicUIForActive(){
    var a = getActiveAudio();
    if (!a) return;
    var seek = document.getElementById('mc-seek');
    var time = document.getElementById('mc-time');
    if (isFinite(a.duration)){
        if (seek){ seek.max = a.duration; seek.value = a.currentTime; }
        if (time){ time.textContent = formatTime(a.currentTime)+' / '+formatTime(a.duration); }
    } else {
        if (seek){ seek.max = 100; seek.value = 0; }
        if (time){ time.textContent = '00:00 / 00:00'; }
    }
    syncPlayButton();
}
function bindAudioEvents(audio){
    if (!audio) return;
    audio.addEventListener('loadedmetadata', function(){
        if (audio === getActiveAudio()) updateMusicUIForActive();
    });
    audio.addEventListener('timeupdate', function(){
        if (audio === getActiveAudio()) updateMusicUIForActive();
    });
    audio.addEventListener('play', function(){
        if (audio === getActiveAudio()) syncPlayButton();
    });
    audio.addEventListener('pause', function(){
        if (audio === getActiveAudio()) syncPlayButton();
    });
}