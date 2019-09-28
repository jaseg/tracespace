// main pcb stackup function
'use strict'

var extend = require('xtend')
var wtg = require('whats-that-gerber')
var vb = require('viewbox')

var boardColor = require('./lib/board-color')
var parseOptions = require('./lib/parse-options')
var sortLayers = require('./lib/sort-layers')
var stackLayers = require('./lib/stack-layers')

var SIDES = [wtg.SIDE_TOP, wtg.SIDE_BOTTOM]

var BASE_ATTRIBUTES = {
  version: '1.1',
  xmlns: 'http://www.w3.org/2000/svg',
  'xmlns:dc': "http://purl.org/dc/elements/1.1/",
  'xmlns:cc': "http://creativecommons.org/ns#",
  'xmlns:rdf': "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  'xmlns:svg': "http://www.w3.org/2000/svg",
  'xmlns:sodipodi': "http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd",
  'xmlns:inkscape': "http://www.inkscape.org/namespaces/inkscape",
  'xmlns:xlink': 'http://www.w3.org/1999/xlink',
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
  'stroke-width': 0,
  'fill-rule': 'evenodd',
  'clip-rule': 'evenodd',
}

var INSNS_B64 = require('./lib/instruction_svg_template_b64')

module.exports = function pcbStackupCore(layers, inputOpts) {
  var options = parseOptions(inputOpts)
  var sorted = sortLayers(layers)

  var id = options.id
  var color = options.color
  var attributes = options.attributes
  var useOutline = options.useOutline
  var element = options.createElement

  var stacks = SIDES.map(function(side) {
    return stackLayers(
      element,
      id,
      side,
      sorted[side],
      sorted.drills,
      sorted.outline,
      useOutline,
      true
    )
  })

  var box = stacks.reduce(function(result, stack) {
    return vb.add(result, stack.box)
  }, vb.create())

  if (box.length !== 4) box = [0, 0, 0, 0]

  return stacks.reduce(function(result, stack, index) {
    var side = SIDES[index]
    var style = boardColor.getStyleElement(element, id + '_', side, color)
    var units = stack.units
    var mechMaskId = stack.mechMaskId
    var outClipId = stack.outClipId
    var view = `<sodipodi:namedview id="base"
     pagecolor="#316aab" bordercolor="#666666"
     borderopacity="1.0"
     inkscape:pageopacity="1"
     inkscape:pageshadow="2"
     inkscape:zoom="1.2623173"
     inkscape:cx="985.91527"
     inkscape:cy="444.29359"
     inkscape:document-units="mm"
     inkscape:current-layer="inkscape_layer_tps"
     showgrid="false"
     inkscape:window-maximized="1" />`
    var defs = [style].concat(stack.defs)
    defs.push(element('radialGradient', {id: 'BackgroundGradient'}, [
      element('stop', {offset: '0%', 'stop-color': 'white'}),
      element('stop', {offset: '100%', 'stop-color': 'black', 'stop-opacity': '0'})
    ]))
    var layer = [
      element(
        'g',
        getGroupAttributes(box, side, mechMaskId, outClipId),
        stack.layer
      ),
    ]
    var layerPads = [
      element(
        'g',
        getGroupAttributes(box, side),
        stack.copies
      ),
    ]
    var layerOutline = [
      element(
        'g',
        getGroupAttributes(box, side),
        [stack.outline]
      ),
    ]

    var defsNode = element('defs', {}, defs)
    var layerNode = element('g', getLayerAttributes(box), layer)
    var padsNode = element('g', getLayerAttributes(box), layerPads)
    var outlineNode = element('g', getLayerAttributes(box), layerOutline)
    var sideAttributes = extend(
      BASE_ATTRIBUTES,
      {
        id: id + '_' + side,
        viewBox: vb.asString(box),
        width: box[2] / 1000 + units,
        height: box[3] / 1000 + units,
      },
      attributes
    )

    var insnsNode = element('g', {
      id: 'insns_group',
      transform: `translate(${box[0] - 155000}, ${box[1] - 95000})`,
    }, [INSNS_B64])
    var backgroundRect = element('rect',
      {x: box[0], y: box[1], width: box[2], height: box[3], fill: 'url(#BackgroundGradient)'})

    var inkscapeLayerBackground = element('g',
      {'inkscape:groupmode': 'layer',
        'inkscape:label': 'Background',
        'sodipodi:insensitive': true,
        'id': 'inscape_layer_insns'
      }, [backgroundRect])

    var inkscapeLayerInsns = element('g',
      {'inkscape:groupmode': 'layer',
        'inkscape:label': 'Instructions',
        'sodipodi:insensitive': true,
        'id': 'inscape_layer_insns',
      }, [insnsNode])

    var inkscapeLayerRender = element('g',
      {'inkscape:groupmode': 'layer',
        'inkscape:label': 'Board Render',
        'sodipodi:insensitive': true,
        'id': 'inscape_layer_render'
      }, [layerNode])

    var inkscapeLayerPads = element('g',
      {'inkscape:groupmode': 'layer',
        'inkscape:label': 'Pads',
        'id': 'inscape_layer_pads'
      }, [padsNode])

    var inkscapeLayerOutline = element('g',
      {'inkscape:groupmode': 'layer',
        'inkscape:label': 'Outline',
        'sodipodi:insensitive': true,
        'id': 'inscape_layer_outline'
      }, [outlineNode])

    var inkscapeLayerTPs = element('g',
      {'inkscape:groupmode': 'layer',
        'inkscape:label': 'Test Points',
        'id': 'inscape_layer_tps'
      }, [])

    var inkscapeLayerMount = element('g',
      {'inkscape:groupmode': 'layer',
        'inkscape:label': 'Mounting Holes',
        'id': 'inscape_layer_mount'
      }, [])

    var inkscapeLayerGrip = element('g',
      {'inkscape:groupmode': 'layer',
        'inkscape:label': 'Grip Slots',
        'id': 'inscape_layer_grip'
      }, [])

    result[side] = {
      svg: element('svg', sideAttributes, [
        view,
        defsNode,
        inkscapeLayerBackground,
        inkscapeLayerInsns,
        inkscapeLayerRender,
        inkscapeLayerPads,
        inkscapeLayerOutline,
        inkscapeLayerGrip,
        inkscapeLayerMount,
        inkscapeLayerTPs]),
      attributes: sideAttributes,
      defs: defs,
      layer: layer,
      viewBox: box,
      width: box[2] / 1000,
      height: box[3] / 1000,
      units: units,
    }

    return result
  }, options)
}

function getGroupAttributes(box, side, mechMaskId, outClipId) {
  var attr = {}

  if (mechMaskId) {
    attr['mask'] = 'url(#' + mechMaskId + ')'
  }

  if (outClipId) {
    attr['clip-path'] = 'url(#' + outClipId + ')'
  }

  // flip the bottom render in the x
  if (side === wtg.SIDE_BOTTOM) {
    var xTranslation = 2 * box[0] + box[2]
    attr.transform = 'translate(' + xTranslation + ',0) scale(-1,1)'
  }

  return attr
}

function getLayerAttributes(box) {
  var yTranslation = 2 * box[1] + box[3]
  return {transform: 'translate(0,' + yTranslation + ') scale(1,-1)'}
}
