$($ => {

	/**
	 * Criando evento de drag'n'drop descente
	 */
	var dragEvent = false;

	/**
	 * Essa função é responsável por corrigir o parâmetro de 'em qual
	 * parte o usuário emitiu o clique dentro do elemento?' que é
	 * retornado pelo evento de drag
	 */
	function verificarDeslocamentoDoClique(e, $alvo, $emissor){
		var emissorOffset	= $emissor.offset();
		var targetOffset	= $alvo.offset();

		if (e.originalEvent)
			e = e.originalEvent;
		
		//	tratando webkit mobile
		if (TouchEvent && e instanceof TouchEvent) {
			if (e.touches.length) {
				var dedoUm	= e.touches[0];
				var pos		= $emissor.position();

				return {
					X: dedoUm.pageX - pos.left,
					Y: dedoUm.pageY - pos.top
				};
			} else {
				return {
					X: 0,
					Y: 0
				};
			}
		}

		//	tratando firefox
		var offset = {
			X: e.offsetX || e.layerX - $alvo.position().left,
			Y: e.offsetY || e.layerY - $alvo.position().top
		};

		offset.X += (targetOffset.left - emissorOffset.left);
		offset.Y += (targetOffset.top - emissorOffset.top);

		return offset;
	}

	/**
	 * Quando o usuário termina de executar o movimento de drag
	 */
	function emitirDrop(e){
		var $body		= $('body');
		var $document	= $(document);
		var dg			= dragEvent;
		var evento		= dg.originalEvent;
		var orig		= e.originalEvent;
		
		$body.removeClass('checking-if-drag');
		$body.removeClass('dragging');
		if ($body.attr('class') == '')
			$body.removeAttr('class');

		$(dg.element).trigger('drop', [{
			clientX: orig.clientX,
			clientY: orig.clientY,
			offsetX: dg.offset.X,
			offsetY: dg.offset.Y
		}]);
		
		dragEvent = false;
	}

	/** 
	 * Verifica se o usuário continua segurando o botão de clique, no caso
	 * dele ter soltado e não ter emitido evento
	 */
	function estaSegurando(e){
		if (e.originalEvent) { e = e.originalEvent; }

		return (
			e.which == 1 || // quer dizer que a pessoa está segurando o botão de clique
			e instanceof TouchEvent &&
			e.touches.length != 0 // quando for um evento de touch e a pessoa estiver com pelo menos um dedo na tela
		);
	}

	$(document).on('mousedown', '[contenteditable]', function(e){
		$(this).attr('contenteditable', true);
		$(this).focus();
	});

	$(document).on('blur', '[contenteditable]', function(e){
		$(this).attr('contenteditable', false);
	});

	/**
	 * Dizendo se algum elemento consegue emitir o evento de clique rapido, para que um drag'n'drop
	 * que deu errado não seja confundido com um clique
	 */
	$(document).on('mousedown', '.event-fastclick', function(e){
		let when		= new Date().getTime();
		let $this		= $(this);
		let dragging	= true;
		let onMouseUp	= e => {
			$this.off('mouseup', onMouseUp);
			let done		= new Date().getTime();
			let clickTime	= done - when;
			dragging		= false;

			if (clickTime < 300) $this.trigger('fastclick', e);
		};

		$this.on('mouseup', onMouseUp);
	});

	/**
	 * O primeiro passo para se iniciar um drag, é o mousedown, essa
	 * função avisa que o primeiro passo já foi estabelecido, e pede
	 * para o body verificar o segundo passo, que é a movimentação do
	 * mouse com o botão sendo segurado
	 */
	$(document).on('mousedown touchstart', '.event-draggable', function inicioDoArrastar(e){
		var $this		= $(this);
		var $body		= $('body');

		dragEvent = {
			element:		$this,
			movements:		0,
			originalEvent:	e.originalEvent,
			offset:			verificarDeslocamentoDoClique(e, $(e.target), $this)
		};

		$body.addClass('checking-if-drag');
	});

	/**
	 * Verifica se a pessoa esta arrastando o elemento ou se somente
	 * deu um clique, caso o que tiver acontecido for considerado um
	 * evento de drag, então o evento é emitido
	 */
	$(document).on('mousemove touchmove', 'body.checking-if-drag', function verificarSeArrasta(e){
		var $body		= $(this);
		var $document	= $(document);
		var dg			= dragEvent;

		if (estaSegurando(e) && dg) {
			if (dg.movements >= 1) {
				//	não esta mais verificando se esta arrastando
				$body.removeClass('checking-if-drag');

				//	confirmando que um elementos está sendo arrastado
				$body.addClass('dragging');

				//	avisando as escutas que o evento de arrastar começou
				var evento = dg.originalEvent;

				$(dg.element).trigger('dragstart', [{
					clientX: evento.clientX,
					clientY: evento.clientY,
					offsetX: dg.offset.X,
					offsetY: dg.offset.Y
				}]);
			} else {
				dg.movements++;
			}
		} else {
			$(dg.element).trigger('dragcancel');
		}
	});

	/**
	 * Quando todos os passos para que aquele evento seja considerado
	 * um evento de drag não foram concluidos
	 */
	$(document).on('mouseup touchend touchcancel dragcancel', 'body.checking-if-drag', function naoArrastou(e){
		var $body		= $('body');

		$body.removeClass('checking-if-drag');
		$body.removeClass('dragging');

		if ($body.attr('class') == '')
			$body.removeAttr('class');
	});
	
	/**
	 * Quando este elemento está sendo executado, é por que todos os
	 * passos para que o drag fosse considerado ativo foram completados
	 * e agora vai se manter emitindo o evento relacionado a
	 * movimentação do elemento na tela até que ele seja solto
	 */
	$(document).on('mousemove touchmove', 'body.dragging', function estaArrastando(e){
		var $body		= $(this);
		var $document	= $(document);
		var dg			= dragEvent;
		var evento		= dg.originalEvent;
		var orig		= e.originalEvent;
		var touch		= orig instanceof TouchEvent ? orig.touches[0] : undefined;

		if (estaSegurando(e)) {
			$(dg.element).trigger('dragmove', [{
				clientX: (touch || orig).clientX,
				clientY: (touch || orig).clientY,
				offsetX: dg.offset.X,
				offsetY: dg.offset.Y
			}]);
		} else {
			emitirDrop(e);
		}
	});

	/**
	 * Quando o usuário termina de executar o movimento de drag
	 */
	$(document).on('mouseup touchend touchcancel', 'body.dragging', function terminarDeArrastar(e){
		emitirDrop(e);
	});
});

$($ => {
	var $substitute = null;
	var userConfigurations = {
		baseSize:		25,
		tileMargin:		3,
		iconsPerColumn: 4
	};
	less.modifyVars(userConfigurations);

	$(document).on('dragstart', '.col-wrapper > ul.col > li', function(e, cursor){
		var $this = $(this).addClass('dragging');

		$substitute = $('<li>', {
			class: 'fake' + ($this.hasClass('big')? ' big' : '') 
		});

		$this.after($substitute);
	});

	$(document).on('dragstart dragmove', '.col-wrapper > ul.col > li', function(e, cursor){
		let $changeable = $(), newPositionAt = 'before',
		y		= cursor.clientY - cursor.offsetY + scrollY,
		x		= cursor.clientX - cursor.offsetX + scrollX;

		$(this).css({
			left:	x,
			top:	y
		});

		$('.col-wrapper > ul.col > li:not(.dragging, .fake)').each(function(){
			let $this	= $(this);
			let rec		= {
				x: $this.position().left,
				y: $this.position().top,
				w: $this.width(),
				h: $this.height()
			}

			if (rec.x < x && rec.y < y && x < (rec.x + rec.w) && y < (rec.y + rec.h)) {
				newPositionAt	= (x < (rec.x + rec.w / 2))? 'before' : 'after';
				$changeable		= $this;

				return false;
			}
		});

		if ($changeable && $changeable.length != 0 && $substitute && newPositionAt){
			$changeable[newPositionAt]($substitute);
			$('div.col-wrapper').trigger('simulate-move');
		}

		$changeable		= $();
		newPositionAt	= null;
	});

	$(document).on('drop', '.col-wrapper > ul.col > li', function(e, cursor){
		var $this = $(this);

		$this.removeClass('dragging');
		$this.removeAttr('style');
		$substitute.after($this);
		$substitute.remove();
		$substitute = null;
		$('div.col-wrapper').trigger('move-item');
	});

	$(document).on('add-item move-item simulate-move', 'div.col-wrapper', function(){
		var $col		= $(this).find('.col');
		var colNumber	= Math.round(($col.find(' :last').position().left - $col.position().left)  / $col.outerWidth()) + 1;

		$(this).css({ width: colNumber * $col.width() });
	});

	setTimeout(f => $('div.col-wrapper').trigger('add-item'), 0);
});
