import { useEffect, useState } from "react";
import { apiUrl } from "../auth/api";

interface ProfileData {
  student_name: string;
  nis: string;
  username: string;
  class_name: string;
  grade_level: number;
  homeroom_teacher_name: string | null;
  school_year: string;
  semester: number;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetch(apiUrl("/api/student/profile"), { credentials: "include" })
      .then(async (r) => {
        if (!active) return;
        if (!r.ok) throw new Error("Failed to load profile");
        return r.json();
      })
      .then((d) => {
        if (active && d?.profile) setProfile(d.profile);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  if (loading) return <div className="loading-screen"><div className="loading-orb" /><p>Loading profile...</p></div>;
  if (error) return <section className="page-content"><p className="form-error">{error}</p></section>;
  if (!profile) return null;

  return (
    <section className="page-content">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Student / Profile</span>
          <h1>My Profile</h1>
          <p>Your personal and academic information</p>
        </div>
      </div>

      <div className="profile-grid">
        <article className="profile-card">
          <span className="eyebrow">Personal Information</span>
          <div className="profile-card-body">
            <div className="profile-field">
              <label>Name</label>
              <span>{profile.student_name}</span>
            </div>
            <div className="profile-field">
              <label>NIS</label>
              <span>{profile.nis}</span>
            </div>
            <div className="profile-field">
              <label>Username</label>
              <span>{profile.username}</span>
            </div>
          </div>
        </article>

        <article className="profile-card">
          <span className="eyebrow">Class Information</span>
          <div className="profile-card-body">
            <div className="profile-field">
              <label>Class</label>
              <span>{profile.class_name}</span>
            </div>
            <div className="profile-field">
              <label>Grade Level</label>
              <span>{profile.grade_level}</span>
            </div>
            <div className="profile-field">
              <label>Homeroom Teacher</label>
              <span>{profile.homeroom_teacher_name ?? "-"}</span>
            </div>
          </div>
        </article>

        <article className="profile-card">
          <span className="eyebrow">Academic Information</span>
          <div className="profile-card-body">
            <div className="profile-field">
              <label>Current Academic Period</label>
              <span>{profile.school_year}</span>
            </div>
            <div className="profile-field">
              <label>Semester</label>
              <span>{profile.semester}</span>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
