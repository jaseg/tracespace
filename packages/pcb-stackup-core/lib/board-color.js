// board color defaults and css generation
'use strict'

var colorString = require('color-string')

var LAYER_IDS = ['fr4', 'cu', 'cf', 'sm', 'ss', 'sp', 'out']

var DEFAULTS = {
  fr4: '#b7c4c8',
  cu: '#ffffff',
  cf: '#cc9933',
  sm: '#000000',
  ss: '#ff0000',
  sp: '#dddddd',
  out: '#002255',
}

function getColor(overrides) {
  overrides = overrides || {}

  return LAYER_IDS.reduce(function(color, id) {
    color[id] = overrides[id] || DEFAULTS[id]
    return color
  }, {})
}

function getStyleElement(element, prefix, side, color) {
  return element('style', {}, [
    LAYER_IDS.map(function(id) {
      var selector = '.' + prefix + id
      var style = colorToCssString(color[id])
      return selector + ' {' + style + '}'
    }).join('\n'),
  ])
}

function colorToCssString(color) {
  var parsedColor = colorString.get(color)

  if (!parsedColor) return ''

  var css = 'color: '
  var components = parsedColor.value.slice(0, 3)
  var alpha = parsedColor.value[3] != null ? parsedColor.value[3] : 1

  if (parsedColor.model === 'rgb') {
    css += colorString.to.hex(components).toLowerCase()
  } else {
    css += colorString.to[parsedColor.model](components).toLowerCase()
  }

  if (alpha !== 1) {
    css += '; opacity: ' + alpha
  }

  return css + ';'
}

module.exports = {getColor: getColor, getStyleElement: getStyleElement}
