import AppKit
import Foundation

struct Payload: Decodable {
  let sourceImagePath: String
  let outputImagePath: String
  let width: Int
  let height: Int
  let brand: String
  let name: String
  let kicker: String
  let summary: String
}

func color(_ hex: Int, alpha: CGFloat = 1.0) -> NSColor {
  NSColor(
    calibratedRed: CGFloat((hex >> 16) & 0xff) / 255.0,
    green: CGFloat((hex >> 8) & 0xff) / 255.0,
    blue: CGFloat(hex & 0xff) / 255.0,
    alpha: alpha,
  )
}

func drawAspectFill(image: NSImage, in rect: NSRect) {
  let sourceSize = image.size

  guard sourceSize.width > 0, sourceSize.height > 0 else {
    color(0x1a1f1b).setFill()
    rect.fill()
    return
  }

  let scale = max(rect.width / sourceSize.width, rect.height / sourceSize.height)
  let scaledSize = NSSize(width: sourceSize.width * scale, height: sourceSize.height * scale)
  let drawRect = NSRect(
    x: rect.midX - (scaledSize.width / 2),
    y: rect.midY - (scaledSize.height / 2),
    width: scaledSize.width,
    height: scaledSize.height,
  )

  image.draw(in: drawRect)
}

func paragraphStyle(lineSpacing: CGFloat = 0, alignment: NSTextAlignment = .left) -> NSParagraphStyle {
  let style = NSMutableParagraphStyle()
  style.lineBreakMode = .byWordWrapping
  style.lineSpacing = lineSpacing
  style.alignment = alignment
  return style
}

func drawText(_ text: String, in rect: NSRect, font: NSFont, color: NSColor, lineSpacing: CGFloat = 0) {
  let attributes: [NSAttributedString.Key: Any] = [
    .font: font,
    .foregroundColor: color,
    .paragraphStyle: paragraphStyle(lineSpacing: lineSpacing),
  ]

  NSString(string: text).draw(with: rect, options: [.usesLineFragmentOrigin, .usesFontLeading], attributes: attributes)
}

func measureText(_ text: String, width: CGFloat, font: NSFont, lineSpacing: CGFloat = 0) -> CGFloat {
  let attributes: [NSAttributedString.Key: Any] = [
    .font: font,
    .paragraphStyle: paragraphStyle(lineSpacing: lineSpacing),
  ]

  let bounds = NSString(string: text).boundingRect(
    with: NSSize(width: width, height: .greatestFiniteMagnitude),
    options: [.usesLineFragmentOrigin, .usesFontLeading],
    attributes: attributes,
  )

  return ceil(bounds.height)
}

func topRect(x: CGFloat, top: CGFloat, width: CGFloat, height: CGFloat, canvasHeight: CGFloat) -> NSRect {
  NSRect(x: x, y: canvasHeight - top - height, width: width, height: height)
}

func fitText(_ text: String, font: NSFont, width: CGFloat, maxHeight: CGFloat, lineSpacing: CGFloat) -> String {
  if measureText(text, width: width, font: font, lineSpacing: lineSpacing) <= maxHeight {
    return text
  }

  var words = text.split(separator: " ").map(String.init)

  while !words.isEmpty {
    words.removeLast()
    let candidate = words.joined(separator: " ").trimmingCharacters(in: .whitespacesAndNewlines) + "…"

    if measureText(candidate, width: width, font: font, lineSpacing: lineSpacing) <= maxHeight {
      return candidate
    }
  }

  return text
}

func fittedBlock(
  text: String,
  makeFont: (CGFloat) -> NSFont,
  preferredSize: CGFloat,
  minSize: CGFloat,
  width: CGFloat,
  maxHeight: CGFloat,
  lineSpacing: CGFloat
) -> (text: String, font: NSFont, height: CGFloat) {
  var size = preferredSize
  var font = makeFont(size)

  while size > minSize && measureText(text, width: width, font: font, lineSpacing: lineSpacing) > maxHeight {
    size -= 2
    font = makeFont(size)
  }

  let fitted = fitText(text, font: font, width: width, maxHeight: maxHeight, lineSpacing: lineSpacing)
  let height = min(maxHeight, measureText(fitted, width: width, font: font, lineSpacing: lineSpacing))

  return (fitted, font, height)
}

guard CommandLine.arguments.count > 1 else {
  fputs("Expected payload path.\n", stderr)
  exit(1)
}

let payloadPath = CommandLine.arguments[1]
let payloadData = try Data(contentsOf: URL(fileURLWithPath: payloadPath))
let payload = try JSONDecoder().decode(Payload.self, from: payloadData)

let width = payload.width
let height = payload.height
let leftPanelWidth = 650
let rightPanelX = CGFloat(leftPanelWidth)
let rightPanelWidth = CGFloat(width - leftPanelWidth)
let canvasSize = NSSize(width: width, height: height)

let rep = NSBitmapImageRep(
  bitmapDataPlanes: nil,
  pixelsWide: width,
  pixelsHigh: height,
  bitsPerSample: 8,
  samplesPerPixel: 4,
  hasAlpha: true,
  isPlanar: false,
  colorSpaceName: .deviceRGB,
  bytesPerRow: 0,
  bitsPerPixel: 0,
)!

rep.size = canvasSize

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)

let fullRect = NSRect(origin: .zero, size: canvasSize)
color(0x101411).setFill()
fullRect.fill()

let imageRect = NSRect(x: 0, y: 0, width: leftPanelWidth, height: height)

if let image = NSImage(contentsOfFile: payload.sourceImagePath) {
  drawAspectFill(image: image, in: imageRect)
} else {
  color(0x1b201c).setFill()
  imageRect.fill()
}

color(0x000000, alpha: 0.18).setFill()
imageRect.fill(using: .sourceAtop)

let rightPanelRect = NSRect(x: rightPanelX, y: 0, width: rightPanelWidth, height: CGFloat(height))
color(0x101411).setFill()
rightPanelRect.fill()

let glowPath = NSBezierPath(roundedRect: NSRect(x: 682, y: 42, width: 180, height: 44), xRadius: 22, yRadius: 22)
color(0xb88445, alpha: 0.16).setFill()
glowPath.fill()
color(0xb88445, alpha: 0.42).setStroke()
glowPath.lineWidth = 1.5
glowPath.stroke()

let brandFont = NSFont(name: "Arial-BoldMT", size: 22) ?? NSFont.boldSystemFont(ofSize: 22)
let titleFontFactory: (CGFloat) -> NSFont = {
  NSFont(name: "TimesNewRomanPS-BoldMT", size: $0) ?? NSFont.boldSystemFont(ofSize: $0)
}
let kickerFontFactory: (CGFloat) -> NSFont = {
  NSFont(name: "Arial-BoldMT", size: $0) ?? NSFont.boldSystemFont(ofSize: $0)
}
let bodyFontFactory: (CGFloat) -> NSFont = {
  NSFont(name: "ArialMT", size: $0) ?? NSFont.systemFont(ofSize: $0)
}

let titleWidth: CGFloat = 420
let titleBlock = fittedBlock(
  text: payload.name,
  makeFont: titleFontFactory,
  preferredSize: 56,
  minSize: 40,
  width: titleWidth,
  maxHeight: 184,
  lineSpacing: 8,
)
let kickerBlock = fittedBlock(
  text: payload.kicker,
  makeFont: kickerFontFactory,
  preferredSize: 28,
  minSize: 22,
  width: 430,
  maxHeight: 88,
  lineSpacing: 6,
)
let summaryTop = 132 + titleBlock.height + 26 + kickerBlock.height + 24
let summaryMaxHeight = max(110, CGFloat(height) - summaryTop - 56)
let summaryBlock = fittedBlock(
  text: payload.summary,
  makeFont: bodyFontFactory,
  preferredSize: 28,
  minSize: 22,
  width: 430,
  maxHeight: summaryMaxHeight,
  lineSpacing: 8,
)

drawText(
  payload.brand,
  in: topRect(x: 704, top: 70, width: 420, height: 28, canvasHeight: CGFloat(height)),
  font: brandFont,
  color: color(0xd8b07a),
)
drawText(
  titleBlock.text,
  in: topRect(x: 704, top: 132, width: titleWidth, height: titleBlock.height, canvasHeight: CGFloat(height)),
  font: titleBlock.font,
  color: color(0xfff7ef),
  lineSpacing: 8,
)
drawText(
  kickerBlock.text,
  in: topRect(
    x: 704,
    top: 132 + titleBlock.height + 26,
    width: 430,
    height: kickerBlock.height,
    canvasHeight: CGFloat(height)
  ),
  font: kickerBlock.font,
  color: color(0xd8b07a),
  lineSpacing: 6,
)
drawText(
  summaryBlock.text,
  in: topRect(x: 704, top: summaryTop, width: 430, height: summaryBlock.height, canvasHeight: CGFloat(height)),
  font: summaryBlock.font,
  color: color(0xefe7dc),
  lineSpacing: 8,
)

let divider = NSBezierPath()
divider.move(to: NSPoint(x: 684, y: 74))
divider.line(to: NSPoint(x: 1132, y: 74))
color(0xb88445, alpha: 0.36).setStroke()
divider.lineWidth = 1
divider.stroke()

NSGraphicsContext.restoreGraphicsState()

guard let imageData = rep.representation(using: .jpeg, properties: [.compressionFactor: 0.92]) else {
  fputs("Unable to encode share card.\n", stderr)
  exit(1)
}

try imageData.write(to: URL(fileURLWithPath: payload.outputImagePath))
