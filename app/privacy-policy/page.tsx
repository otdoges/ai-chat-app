import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/90">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          
          <h1 className="mb-8 text-3xl font-bold md:text-4xl">Privacy Policy</h1>
          
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
            
            <div className="mt-8 p-6 rounded-xl border border-border bg-card">
              <p className="text-xl">
                We don't collect any data from our users.
              </p>
            </div>
            
            <h2 className="mt-12 text-xl font-semibold md:text-2xl">Our Commitment to Privacy</h2>
            <p>
              At AI Chat App, we're committed to protecting your privacy. Our application is designed to provide AI chat services without collecting or storing any of your personal information.
            </p>
            
            <h2 className="mt-8 text-xl font-semibold md:text-2xl">No Data Collection</h2>
            <p>
              We don't collect, store, or process any of the following:
            </p>
            <ul className="list-disc pl-6">
              <li>Personal information</li>
              <li>Messages you send to our AI models</li>
              <li>Usage information</li>
              <li>Cookies or tracking information</li>
            </ul>
            
            <h2 className="mt-8 text-xl font-semibold md:text-2xl">Third-Party Services</h2>
            <p>
              Our application may use third-party AI services to process your queries, but we do not share any personally identifiable information with these services.
            </p>
            
            <h2 className="mt-8 text-xl font-semibold md:text-2xl">Contact Us</h2>
            <p>
              If you have any questions about our privacy practices, feel free to contact us at:
            </p>
            <p className="mt-2">
              Email: otdoges@proton.me
            </p>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="border-t border-border bg-background py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} AI Chat App. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
} 