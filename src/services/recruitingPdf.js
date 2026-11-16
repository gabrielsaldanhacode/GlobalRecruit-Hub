function missingFields(profile) {
  if (!profile) return ["profile"];
  const required = ["full_name", "sport", "position", "country", "graduation_year"];
  const missing = required.filter(key => !profile[key]);
  if (profile.gpa == null && !profile.academic_context?.trim()) missing.push("academic details");
  return missing;
}

function writePdf(doc, profile) {
  doc.info.Title = `${profile.full_name} | Recruiting Profile`;
  doc.info.Author = "GlobalRecruit Hub";
  doc.fontSize(11).fillColor("#156D99").text("GLOBALRECRUIT HUB", { characterSpacing: 1 });
  doc.moveDown(0.7).fontSize(25).fillColor("#142D48").text(profile.full_name);
  doc.moveDown(0.2).fontSize(13).fillColor("#35495D").text(`${profile.sport} | ${profile.position}`);
  doc.moveDown(1.2);
  const detail = (label, value) => {
    if (value == null || value === "") return;
    doc.fontSize(10).fillColor("#567086").text(label.toUpperCase());
    doc.fontSize(13).fillColor("#142D48").text(String(value));
    doc.moveDown(0.6);
  };
  detail("Country", profile.country);
  detail("Graduation or enrollment year", profile.graduation_year);
  detail("Academic context", profile.academic_context);
  detail("GPA (4.0 scale)", profile.gpa);
  if (profile.highlight_url) {
    doc.fontSize(10).fillColor("#567086").text("HIGHLIGHTS");
    doc.fontSize(12).fillColor("#156D99").text(profile.highlight_url, { link: profile.highlight_url, underline: true });
  }
  doc.end();
}

module.exports = { missingFields, writePdf };
