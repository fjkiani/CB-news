"use client"
import { UserCourseListContext } from '@/app/_context/UserCourseListContext';
import { Button } from '@/components/ui/button';
import { useUser } from '@clerk/nextjs'
import Link from 'next/link';
import React, { useContext } from 'react'

function AddCourse() {
    const {user}=useUser();
    const {userCourseList,setUserCourseList}=useContext(UserCourseListContext)


    return (
    <div className='flex items-center justify-between'>
        <div>
            <h2 className='text-3xl'>Hello, 
            <span className='font-bold'>{user?.fullName}</span></h2>
            <p className='text-sm text-gray-500'>Edulga provides real-time, skill-based learning paths that adapt as industries evolve, unlike traditional institutions with static curricula.</p>
        </div>
        <Link href={userCourseList?.length>=5?'https://www.tubeguruji.com/tubeguruji-pro':'/create-course'}>
             <Button>Generate Learning Roadmap</Button>
        </Link>
    </div>
  )
}

export default AddCourse