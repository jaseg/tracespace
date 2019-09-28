// stack layers function (where the magic happens)
'use strict'

var viewbox = require('viewbox')
var wtg = require('whats-that-gerber')

var gatherLayers = require('./_gather-layers')

module.exports = function(
  element,
  id,
  side,
  layers,
  drills,
  outline,
  useOutline,
  copyPads
) {
  var classPrefix = id + '_'
  var idPrefix = id + '_' + side + '_'
  var mechMaskId = idPrefix + 'mech-mask'

  var layerProps = gatherLayers(
    element,
    idPrefix,
    layers,
    drills,
    outline,
    useOutline
  )
  var defs = layerProps.defs
  var box = layerProps.box
  var units = layerProps.units

  layers = layerProps.layerIds
  drills = layerProps.drillIds

  defs.push(mechMask(element, mechMaskId, box, drills))

  // build the layer starting with an fr4 rectangle the size of the viewbox
  var layer = [createRect(element, box, 'currentColor', classPrefix + 'fr4')]
  var copies = []
  var cuLayer = findLayer(layers, wtg.TYPE_COPPER)
  var smLayer = findLayer(layers, wtg.TYPE_SOLDERMASK)
  var ssLayer = findLayer(layers, wtg.TYPE_SILKSCREEN)
  var spLayer = findLayer(layers, wtg.TYPE_SOLDERPASTE)
  var outLayerId = layerProps.outlineId

  // add copper and copper finish
  if (cuLayer.id) {
    var cfMaskId = idPrefix + 'cf-mask'
    var cfMaskShape = smLayer.id
      ? [useLayer(element, smLayer.id)]
      : [createRect(element, box)]
    var cfMaskGroupAttr = {fill: '#fff', stroke: '#fff'}
    var cfMaskGroup = [element('g', cfMaskGroupAttr, cfMaskShape)]

    defs.push(element('mask', {id: cfMaskId}, cfMaskGroup))
    layer.push(useLayer(element, cuLayer.id, classPrefix + 'cu'))
    layer.push(useLayer(element, cuLayer.id, classPrefix + 'cf', cfMaskId))
  }

  // add soldermask and silkscreen
  // silkscreen will not be added if no soldermask, because that's how it works in RL
  if (smLayer.id) {
    // solder mask is... a mask, so mask it
    var smMaskId = idPrefix + 'sm-mask'
    var smMaskShape = [
      createRect(element, box, '#fff'),
      useLayer(element, smLayer.id),
    ]
    var smMaskGroupAtrr = {fill: '#000', stroke: '#000'}
    var smMaskGroup = [element('g', smMaskGroupAtrr, smMaskShape)]

    defs.push(element('mask', {id: smMaskId}, smMaskGroup))

    // add the layer that gets masked
    var smGroupAttr = {mask: 'url(#' + smMaskId + ')'}
    var smGroupShape = []
    if (!copyPads) {
      smGroupShape.push(createRect(element, box, 'currentColor', classPrefix + 'sm'))
    }

    if (ssLayer.id) {
      smGroupShape.push(useLayer(element, ssLayer.id, classPrefix + 'ss'))
    }

    layer.push(element('g', smGroupAttr, smGroupShape))
  }

  // add solderpaste
  if (spLayer.id) {
    layer.push(useLayer(element, spLayer.id, classPrefix + 'sp'))
  }

  // add board outline if necessary
  if (outLayerId && !useOutline) {
    layer.push(useLayer(element, outLayerId, classPrefix + 'out'))
  }

  var outline
  if (copyPads) {
    if (smLayer.id) {
      copies.push(smLayer.makeCopy({id: idPrefix + 'sm-copy', fill: 'currentColor', stroke: 'currentColor', class: classPrefix + 'sm'}))
    }

    if (spLayer.id) {
      copies.push(spLayer.makeCopy({id: idPrefix + 'sp-copy', fill: 'currentColor', stroke: 'currentColor', class: classPrefix + 'sp'}))
    }

    if (layerProps.copyOutline && useOutline) {
      outline = layerProps.copyOutline({id: idPrefix + 'out-copy', fill: 'none', stroke: 'currentColor', class: classPrefix + 'out' + ' ' + 'board-outline'})
    }
  }

  return {
    defs: defs,
    layer: layer,
    copies: copies,
    mechMaskId: mechMaskId,
    outClipId: outLayerId && useOutline ? outLayerId : null,
    outline: outline,
    box: box,
    units: units,
  }
}

function findLayer(layers, type) {
  var layer
  var i

  for (i = 0; i < layers.length; i++) {
    layer = layers[i]
    if (layer.type === type) {
      return layer
    }
  }
}

function useLayer(element, id, className, mask) {
  var attr = {'xlink:href': '#' + id}

  if (className) {
    attr.fill = 'currentColor'
    attr.stroke = 'currentColor'
    attr.class = className
  }

  if (mask) {
    attr.mask = 'url(#' + mask + ')'
  }

  return element('use', attr)
}

function createRect(element, box, fill, className) {
  var attr = viewbox.rect(box)

  if (fill) {
    attr.fill = fill
  }

  if (className) {
    attr.class = className
  }

  return element('rect', attr)
}

function mechMask(element, id, box, drills) {
  var children = drills.map(function(layer) {
    return useLayer(element, layer.id)
  })

  children.unshift(createRect(element, box, '#fff'))

  var groupAttr = {fill: '#000', stroke: '#000'}
  var group = [element('g', groupAttr, children)]

  return element('mask', {id: id}, group)
}
