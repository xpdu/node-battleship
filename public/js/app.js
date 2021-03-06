$(function () {
  window.app = {}

  var app = window.app
  var utils = window.utils

  app.socket = undefined

  app.showAlert = function (alertId) {
    $('.custom-alert').each(function () {
      if (!$(this).hasClass('hidden')) {
        $(this).addClass('hidden')
      }
    })
    $(alertId).removeClass('hidden')
  }

  app.CELL_STYLE_LINK = 'custom-link-cell'

  app.cleanBoard = function (selectors) {
    for (var i = 0; i < 100; i++) {
      var cell = $('#' + selectors(i).div)
      var paper = Snap('#' + selectors(i).svg)

      paper.clear()
      cell.off('click')
      cell.removeClass(app.CELL_STYLE_LINK)
      cell.removeClass(utils.cellStyle(utils.CellTypes.EMPTY))
      cell.removeClass(utils.cellStyle(utils.CellTypes.SHIP))
      cell.removeClass(utils.cellStyle(utils.CellTypes.MISS))
      cell.removeClass(utils.cellStyle(utils.CellTypes.HIT))
    }
  }

  app.attack = function(i) {
    app.socket.emit(utils.ClientRequests.ON_ATTACK, {
      cellId: i,
    })
  }

  app.renderBoard = function (selectors, board, isAttacking) {
    board.forEach(function (cellType, i) {
      var cell = $('#' + selectors(i).div)

      switch (cellType) {
      case utils.CellTypes.EMPTY:
        if (isAttacking) {
          cell.addClass(app.CELL_STYLE_LINK)
          cell.on('click', function() {
            app.attack(i)
          })
        }
        break
      case utils.CellTypes.SHIP:
        break
      case utils.CellTypes.MISS:
        var paper = Snap('#' + selectors(i).svg)
        paper.circle(50, 50, 7).attr({
          fill: "#333"
        })
        break
      case utils.CellTypes.HIT:
        var paper = Snap('#' + selectors(i).svg)
        var attrs = {
          strokeWidth: 8,
          stroke: "#333",
          strokeLinecap:"round"
        }
        paper.line(20, 20, 80, 80).attr(attrs)
        paper.line(80, 20, 20, 80).attr(attrs)
        break
      }

      cell.addClass(utils.cellStyle(cellType))
    })
  }

  app.onAttackDefend = function (data, isAttacking) {
    app.cleanBoard(utils.localCellSelectors)
    app.renderBoard(utils.localCellSelectors, data.localBoard, false)

    app.cleanBoard(utils.remoteCellSelectors)
    app.renderBoard(utils.remoteCellSelectors, data.remoteBoard, isAttacking)

    app.showAlert(isAttacking ? '#attack-alert' : '#defend-alert')
  }

  /* Handle UI controls */
  new Clipboard('#copy-button')

  $('#join-button').click(function () {
    var battleId = null

    if (window.location.pathname.length > 1) {
      battleId = window.location.pathname.substring(1)
      window.history.pushState(undefined, 'Battleship (game)', '/');
    }

    app.socket = io('/', {
      reconnection: false
    })

    /* Handle server reponses */
    app.socket.on(utils.ServerResponses.ON_ACCEPT, function (data) {
      $('#battle-input').val(window.location.href + data.battleId)
      app.showAlert('#link-alert')
    })

    app.socket.on(utils.ServerResponses.ON_REJECT, function (data) {
      app.socket.off('disconnect')
      $('#error-span').text(data.msg)
      app.showAlert('#error-alert')
    })

    app.socket.on(utils.ServerResponses.ON_ATTACK, function (data) {
      app.onAttackDefend(data, true)
    })

    app.socket.on(utils.ServerResponses.ON_DEFEND, function (data) {
      app.onAttackDefend(data, false)
    })

    app.socket.on(utils.ServerResponses.ON_WIN, function (data) {
      app.socket.off('disconnect')
      app.onAttackDefend(data, false)
      app.showAlert('#win-alert')
    })

    app.socket.on(utils.ServerResponses.ON_LOSE, function (data) {
      app.socket.off('disconnect')
      app.onAttackDefend(data, false)
      app.showAlert('#lose-alert')
    })

    app.socket.on('disconnect', function () {
      app.showAlert('#error-alert')
    })

    app.socket.emit(utils.ClientRequests.ON_JOIN, {
      battleId: battleId,
      fleet: window.tmp.fleet,
    })
  })

  $('#shuffle-button').click(function () {
    window.tmp.fleet = utils.createFleet()
    var canvas = utils.renderFleet(window.tmp.fleet)

    app.cleanBoard(utils.localCellSelectors)
    app.renderBoard(utils.localCellSelectors, canvas, false)
  })

  $('#fleet-name-input').keypress(function (e) {
    var code = e.which
    if (code === 13) {
      $('#join-button').click()
      e.preventDefault()
    }
  })
})
