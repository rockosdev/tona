import { getAboutOptions, getItemGroupsOptions } from 'tona-options'
import { BackToTop } from '../back-to-top'
import { Footer } from '../footer'
import { Separator } from '../separator'
import { TopNavBar } from '../top-nav-bar'
import { About } from './about'
import { ItemGroups } from './item-groups'
import { PostList } from './post-list'
import { ProfileCover } from './profile-cover'
import { ProfileHeader } from './profile-header'

export function HomePage() {
  const { enable: aboutEnabled, bio } = getAboutOptions()
  const { enable: itemGroupsEnabled, groups } = getItemGroupsOptions()
  const showAbout = aboutEnabled && !!bio?.trim()
  const showItemGroups = itemGroupsEnabled && groups.length > 0

  return (
    <div className="flex min-h-screen flex-col">
      <TopNavBar sticky></TopNavBar>
      <main className="max-w-screen overflow-x-hidden px-2">
        <div className="mx-auto md:max-w-3xl *:[[id]]:scroll-mt-22">
          <ProfileCover />

          <ProfileHeader />
          <Separator />

          {showAbout && <About />}
          {showAbout && <Separator />}

          {showItemGroups && <ItemGroups />}
          {showItemGroups && <Separator />}

          <PostList />
          <Separator />
        </div>
      </main>
      <Footer></Footer>
      <BackToTop></BackToTop>
    </div>
  )
}
