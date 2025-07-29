/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface FormData {
  phoneNumber: string;
  firstName: string;
  lastName: string;
  profilePic: string;
}

export default function ProfileForm() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    phoneNumber: "",
    firstName: "",
    lastName: "",
    profilePic: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      fetch("/api/user")
        .then(async (res) => {
          if (!res.ok) {
            throw new Error(
              `API error: ${res.status} - ${
                res.status === 404
                  ? "User API route not found"
                  : await res.text()
              }`
            );
          }
          return res.json();
        })
        .then((data) => {
          setFormData({
            phoneNumber: data.phoneNumber || "",
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            profilePic: data.profilePic || "",
          });
          setPreview(data.profilePic || null);
        })
        .catch((err) => setError(`Failed to load profile: ${err.message}`));
    } else if (status === "unauthenticated") {
      setError("Please sign in to view your profile");
      router.push("/api/auth/signin");
    }
  }, [session, status, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageBlob(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    try {
      let profilePicUrl = formData.profilePic;

      if (imageBlob) {
        const uploadFormData = new FormData();
        uploadFormData.append("file", imageBlob);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: uploadFormData,
        });

        if (!uploadRes.ok) {
          throw new Error(`Image upload failed: ${uploadRes.status}`);
        }

        const uploadData = await uploadRes.json();
        console.log("Upload Response:", uploadData); // Debug upload URL
        if (!uploadData.url) {
          throw new Error("No URL returned from upload");
        }
        profilePicUrl = uploadData.url;
        setFormData({ ...formData, profilePic: profilePicUrl }); // Update formData
      }

      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phoneNumber: formData.phoneNumber,
          profilePic: profilePicUrl || "", // Ensure profilePic is sent
        }),
      });

      const data = await res.json();
      console.log("PATCH Response:", data); // Debug PATCH response

      if (!res.ok) {
        throw new Error(data.error || `Profile update failed: ${res.status}`);
      }

      alert(
        `Profile updated! ProfilePic: ${data.user.profilePic || "Not set"}`
      );
      router.push("/dashboard/homePage");
    } catch (error: any) {
      console.error(error);
      setError(error.message || "Error updating profile");
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-cyan-400 to-green-300 p-4">
      <Card className="w-full max-w-lg bg-black text-white shadow-xl rounded-xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">
            Edit Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          {preview && (
            <div className="flex justify-center">
              <Image
                src={preview}
                alt="Profile Preview"
                width={100}
                height={100}
                className="rounded-full object-cover"
              />
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Profile Picture</label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="h-10 text-sm mt-1 bg-gray-800 text-white border-gray-600 placeholder-gray-400"
              />
            </div>
            <div>
              <label className="text-sm font-medium">First Name</label>
              <Input
                className="h-10 text-sm mt-1 bg-gray-800 text-white border-gray-600 placeholder-gray-400"
                type="text"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                placeholder="First Name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Last Name</label>
              <Input
                className="h-10 text-sm mt-1 bg-gray-800 text-white border-gray-600 placeholder-gray-400"
                type="text"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                placeholder="Last Name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Phone Number</label>
              <Input
                className="h-10 text-sm mt-1 bg-gray-800 text-white border-gray-600 placeholder-gray-400"
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) =>
                  setFormData({ ...formData, phoneNumber: e.target.value })
                }
                placeholder="Phone Number"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-white text-black hover:bg-gray-200 font-semibold h-10 text-sm"
            >
              Save Profile
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
