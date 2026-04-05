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
let titleFont = NSFont(name: "TimesNewRomanPS-BoldMT", size: 56) ?? NSFont.boldSystemFont(ofSize: 56)
let kickerFont = NSFont(name: "Arial-BoldMT", size: 28) ?? NSFont.boldSystemFont(ofSize: 28)
let bodyFont = NSFont(name: "ArialMT", size: 28) ?? NSFont.systemFont(ofSize: 28)

drawText(payload.brand, in: NSRect(x: 704, y: 70, width: 420, height: 28), font: brandFont, color: color(0xd8b07a))

let titleWidth: CGFloat = 420
let titleHeight = measureText(payload.name, width: titleWidth, font: titleFont, lineSpacing: 8)
drawText(
  payload.name,
  in: NSRect(x: 704, y: 146, width: titleWidth, height: min(220, titleHeight)),
  font: titleFont,
  color: color(0xfff7ef),
  lineSpacing: 8,
)

let kickerWidth: CGFloat = 420
let kickerHeight = measureText(payload.kicker, width: kickerWidth, font: kickerFont, lineSpacing: 6)
let kickerY = max(330, 146 + min(220, titleHeight) + 28)
drawText(
  payload.kicker,
  in: NSRect(x: 704, y: CGFloat(kickerY), width: kickerWidth, height: min(84, kickerHeight)),
  font: kickerFont,
  color: color(0xd8b07a),
  lineSpacing: 6,
)

let summaryY = CGFloat(kickerY) + min(84, kickerHeight) + 30
drawText(
  payload.summary,
  in: NSRect(x: 704, y: summaryY, width: 430, height: 168),
  font: bodyFont,
  color: color(0xefe7dc),
  lineSpacing: 8,
)

let divider = NSBezierPath()
divider.move(to: NSPoint(x: 684, y: 536))
divider.line(to: NSPoint(x: 1132, y: 536))
color(0xb88445, alpha: 0.36).setStroke()
divider.lineWidth = 1
divider.stroke()

NSGraphicsContext.restoreGraphicsState()

guard let imageData = rep.representation(using: .jpeg, properties: [.compressionFactor: 0.92]) else {
  fputs("Unable to encode share card.\n", stderr)
  exit(1)
}

try imageData.write(to: URL(fileURLWithPath: payload.outputImagePath))
