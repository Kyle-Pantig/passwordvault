'use client'

import { Safari } from '@/components/magicui/safari'

interface SafariDemoProps {
  images: string[]
  texts?: string[]
  autoRotate?: boolean
  rotationInterval?: number
  url?: string
  slideDirection?: 'horizontal' | 'vertical'
  animationDuration?: number
  showText?: boolean
  textPosition?: 'top' | 'bottom' | 'center'
}

export function SafariDemo({ 
  images, 
  texts,
  autoRotate = true, 
  rotationInterval = 3000,
  url = "https://digivault.app/vault",
  slideDirection = 'horizontal',
  animationDuration = 1000,
  showText = true,
  textPosition = 'bottom'
}: SafariDemoProps) {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <Safari
        url={url}
        mode="default"
        className="w-full h-auto"
        imageSrcs={images}
        texts={texts}
        autoRotate={autoRotate}
        rotationInterval={rotationInterval}
        slideDirection={slideDirection}
        animationDuration={animationDuration}
        showText={showText}
        textPosition={textPosition}
      />
    </div>
  )
}

// Example usage:
// <SafariDemo 
//   images={["/image1.png", "/image2.png", "/image3.png"]}
//   texts={["First Image", "Second Image", "Third Image"]}
//   autoRotate={true}
//   rotationInterval={4000}
//   url="https://example.com"
//   slideDirection="horizontal"
//   animationDuration={800}
//   showText={true}
//   textPosition="bottom"
// />
