export default async function exit(_req, res) {
  // Exit the current user from "Preview Mode". This function accepts no args.
  res.clearPreviewData()

  res.writeHead(307, { Location: '/' })
  res.end()
}