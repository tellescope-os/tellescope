import React, { useEffect, useRef, useState } from "react"

import { Avatar, AvatarProps, Styled } from "./mui"
import { useResolvedSession } from "./authentication"
import { APIError } from "."


interface DisplayPictureProps extends AvatarProps {
  user: { id: string, avatar?: string };
  onError?: (e: APIError) => void;
}
export const DisplayPicture = ({ user, onError=console.error, ...avatarProps } : DisplayPictureProps & Styled) => {
  const session = useResolvedSession()

  const [loadedImage, setLoadedImage] = useState({ uri: '', id: '' })
  const fetchRef = useRef({ } as { [index: string]: boolean })

  useEffect(() => {
    if (!user.avatar) return
    if (loadedImage.id === user.id) return 
    if (fetchRef.current[user.id]) return // already fetching
    fetchRef.current[user.id] = true

    session?.api.files.file_download_URL({ secureName: user.avatar })
    .then(({ downloadURL }) => setLoadedImage({ uri: downloadURL, id: user.id }))
    .catch(onError)
    
  }, [fetchRef, user, loadedImage, onError])

  // if user doesn't have picture, or it's still loading
  if (loadedImage.id !== user.id) return <Avatar {...avatarProps}/>

  return (
    <Avatar {...avatarProps} src={loadedImage.uri}/>
  )
}
