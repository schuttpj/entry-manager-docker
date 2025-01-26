"use client"

import { Button } from "@/components/ui/button"
import { Squares } from "@/components/ui/squares-background"
import { TextScramble } from "@/components/ui/text-scramble"
import Link from "next/link"
import { useEffect, useState } from "react"

export default function LandingPage() {
  const features = [
    "Secure Local Storage",
    "AI Voice Transcription",
    "Smart Content Generation",
    "Grid & List Views",
    "Project Management",
    "Voice Annotations",
    "Automated Local Backups",
    "PDF Report Export",
    "Offline-First Design",
    "Custom Categories",
    "Advanced Search & Filter",
    "Zero Cloud Dependency"
  ]

  const industries = [
    {
      name: "Healthcare & Medical",
      description: "Perfect for medical audits, patient room inspections, and facility compliance checks. All data stays local, ensuring HIPAA compliance."
    },
    {
      name: "Government & Defense",
      description: "Ideal for secure facility inspections, equipment audits, and classified project documentation with zero cloud storage."
    },
    {
      name: "Quality Assurance",
      description: "Streamline manufacturing QA processes, defect tracking, and compliance documentation with voice notes and photo annotations."
    },
    {
      name: "Real Estate & Property",
      description: "Comprehensive property inspections, maintenance tracking, and detailed documentation for property managers and investors."
    },
    {
      name: "Legal & Compliance",
      description: "Document evidence collection, site inspections, and case documentation with secure, locally stored data and detailed audit trails."
    },
    {
      name: "Research & Development",
      description: "Secure documentation of experiments, prototypes, and research findings with local storage for sensitive intellectual property."
    }
  ]

  const [currentFeature, setCurrentFeature] = useState(0)
  const [trigger, setTrigger] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length)
      setTrigger((prev) => !prev)
    }, 2000)
    return () => clearInterval(interval)
  }, [features.length])

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Animated squares background */}
      <div className="absolute inset-0 w-full h-full">
        <Squares
          direction="diagonal"
          speed={0.5}
          className="w-full h-full"
          borderColor="#222"
          squareSize={50}
          hoverFillColor="#1a1a1a"
        />
      </div>

      {/* Content overlay */}
      <div className="relative z-10 container mx-auto px-6 py-32 flex flex-col items-center justify-center min-h-screen">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          {/* Main heading with gradient */}
          <h1 className="text-6xl md:text-7xl font-bold tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-white animate-gradient">
              Grid View Project Companion
            </span>
          </h1>

          {/* Scrambling feature text */}
          <div className="h-20 flex items-center justify-center">
            <TextScramble
              trigger={trigger}
              className="text-3xl font-light text-white/90"
              duration={0.6}
              speed={0.02}
            >
              {features[currentFeature]}
            </TextScramble>
          </div>

          {/* Industry cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-12">
            {industries.map((industry, i) => (
              <div
                key={industry.name}
                className="group relative bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-gray-800 hover:border-gray-700 transition-all duration-300 hover:shadow-xl hover:shadow-black/30"
                style={{
                  animationDelay: `${i * 100}ms`,
                }}
              >
                <div className="space-y-3">
                  <div className="font-medium text-xl text-white/90 group-hover:text-white">
                    {industry.name}
                  </div>
                  <div className="h-0 group-hover:h-auto overflow-hidden transition-all duration-300 opacity-0 group-hover:opacity-100">
                    <p className="text-sm text-white/70 group-hover:text-white/90">
                      {industry.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <div className="space-y-4">
            <Link href="/dashboard" className="inline-block">
              <Button
                size="lg"
                className="relative group px-8 py-6 text-lg rounded-full bg-white hover:bg-gray-100 text-black hover:scale-105 transition-all duration-300"
              >
                <span className="relative z-10 font-medium">
                  Get Started
                </span>
                <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 blur-lg transition-all duration-300" />
              </Button>
            </Link>
            <p className="text-white/70 text-sm">
              Your data stays local. Zero cloud dependency.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

